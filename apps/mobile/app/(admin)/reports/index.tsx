import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useTheme } from "../../../src/theme";
import { Card, Badge, Button } from "../../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../../src/api/client";
import { useAuthStore } from "../../../src/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";

export default function ReportsScreen() {
  const { colors, typography, spacing } = useTheme();
  const { token } = useAuthStore();

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("weekly_paper");
  const [reportData, setReportData] = useState<any>(null);
  const [partyLedgerData, setPartyLedgerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // CSV Import State
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchBatches = async () => {
      const res = await apiFetch("/api/batches");
      if (res.success && res.data) {
        setBatches(res.data);
        if (res.data.length > 0) {
          setSelectedBatchId(res.data[0]._id);
        }
      }
    };
    fetchBatches();
  }, []);

  const loadReport = async (type: string, batchIdOverride?: string) => {
    setSelectedReportType(type);
    setLoading(true);
    setReportData(null);
    const bId = batchIdOverride || selectedBatchId;

    try {
      let endpoint = "";
      if (type === "weekly_paper") {
        if (!bId) return;
        endpoint = `/api/reports/weekly-summary/${bId}`;
      } else if (type === "daily_paper") {
        if (!bId) return;
        endpoint = `/api/reports/daily-register/${bId}`;
      } else if (type === "party_ledger") {
        endpoint = `/api/party-ledger`;
      } else if (type === "batch") {
        if (!bId) return;
        endpoint = `/api/reports/batch/${bId}`;
      } else if (type === "sheds") {
        endpoint = "/api/reports/sheds";
      } else if (type === "feed") {
        endpoint = "/api/reports/feed";
      } else if (type === "expenses") {
        endpoint = "/api/reports/expenses";
      } else if (type === "sales") {
        endpoint = "/api/reports/sales";
      } else if (type === "wages") {
        endpoint = "/api/reports/wages";
      }

      if (endpoint) {
        const res = await apiFetch(endpoint);
        if (res.success && res.data) {
          if (type === "party_ledger") {
            setPartyLedgerData(res.data);
          } else {
            setReportData(res.data);
          }
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      selectedBatchId &&
      (selectedReportType === "weekly_paper" ||
        selectedReportType === "daily_paper" ||
        selectedReportType === "batch")
    ) {
      loadReport(selectedReportType, selectedBatchId);
    }
  }, [selectedBatchId]);

  const handleExportCSV = () => {
    let url = "";
    if (selectedReportType === "weekly_paper" && selectedBatchId) {
      url = `${API_BASE_URL}/api/reports/weekly-summary/csv?batchId=${selectedBatchId}`;
    } else if (selectedReportType === "daily_paper" && selectedBatchId) {
      url = `${API_BASE_URL}/api/reports/daily-register/csv?batchId=${selectedBatchId}`;
    } else if (selectedReportType === "batch" && selectedBatchId) {
      url = `${API_BASE_URL}/api/reports/batch/${selectedBatchId}/csv`;
    }

    if (url) {
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        Alert.alert("CSV Export", `Downloading file from:\n${url}`);
      }
    } else {
      Alert.alert(
        "Export",
        "CSV export is available for Weekly Summary, Daily Register, and Flock Reports.",
      );
    }
  };

  const handleImportHistory = async () => {
    if (!csvText.trim()) {
      Alert.alert("Error", "Please paste CSV rows into the text area first.");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await apiFetch("/api/import-history", {
        method: "POST",
        body: JSON.stringify({ csvText }),
      });
      if (res.success && res.data) {
        setImportResult(res.data);
        Alert.alert(
          "Import Complete",
          `Processed ${res.data.totalRows} rows. Saved ${res.data.importedRecords} records.`,
        );
      } else {
        Alert.alert("Import Failed", res.error || "Unable to import CSV");
      }
    } catch (err: any) {
      Alert.alert("Import Error", err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
    >
      <View style={{ marginBottom: spacing.md }}>
        <Text
          testID="reports-header-title"
          style={{
            color: colors.text,
            fontSize: typography.sizes.xl,
            fontWeight: typography.weights.heavy,
          }}
        >
          Reports & Register Registers (PDF & CSV)
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}
        >
          Mirroring Pakistan Farm Paper Registers: Daily Sheet, Weekly Flock
          Summary, & Feed Party Ledger
        </Text>
      </View>

      {/* Report Types Bar */}
      <View style={styles.typesRow}>
        {[
          { key: "weekly_paper", label: "Weekly Summary (FCR)" },
          { key: "daily_paper", label: "Daily Register (Paper)" },
          { key: "party_ledger", label: "Feed Party Ledger" },
          { key: "batch", label: "Flock P&L" },
          { key: "sheds", label: "Shed Comparison" },
          { key: "feed", label: "Feed Usage" },
          { key: "sales", label: "Lifting Ledger" },
          { key: "csv_import", label: "CSV Import History" },
        ].map((r) => (
          <TouchableOpacity
            key={r.key}
            testID={`report-tab-${r.key}`}
            onPress={() => {
              if (r.key === "csv_import") {
                setSelectedReportType("csv_import");
              } else {
                loadReport(r.key);
              }
            }}
            style={[
              styles.typeTab,
              {
                backgroundColor:
                  selectedReportType === r.key
                    ? colors.primary
                    : colors.surface,
                borderColor:
                  selectedReportType === r.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color:
                  selectedReportType === r.key ? colors.white : colors.text,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Batch selector for batch-specific reports */}
      {(selectedReportType === "weekly_paper" ||
        selectedReportType === "daily_paper" ||
        selectedReportType === "batch") &&
      batches.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            Select Batch (Flock):
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {batches.map((b) => (
              <TouchableOpacity
                key={b._id}
                onPress={() => setSelectedBatchId(b._id)}
                style={[
                  styles.batchChip,
                  {
                    backgroundColor:
                      selectedBatchId === b._id
                        ? colors.secondary
                        : colors.surface,
                    borderColor:
                      selectedBatchId === b._id
                        ? colors.secondary
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selectedBatchId === b._id ? colors.white : colors.text,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {b.batchNumber} ({b.status})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Export Action Bar */}
      {selectedReportType !== "csv_import" && (
        <View style={styles.exportBar}>
          <Button
            title="Download CSV"
            variant="outline"
            size="sm"
            onPress={handleExportCSV}
            style={{ marginRight: 8 }}
          />
          <Button
            title="Print / Save PDF"
            variant="secondary"
            size="sm"
            onPress={() =>
              Alert.alert(
                "PDF Export",
                "Register table formatted in notebook column order ready for printing.",
              )
            }
          />
        </View>
      )}

      {/* 1. WEEKLY FLOCK SUMMARY VIEW (Weeks 1-6) */}
      {selectedReportType === "weekly_paper" && reportData && (
        <Card elevated style={{ marginTop: 8 }}>
          <View style={{ marginBottom: 10 }}>
            <Text
              style={{ color: colors.primary, fontSize: 16, fontWeight: "800" }}
            >
              WEEKLY FLOCK SUMMARY (Paper Register Format)
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Batch: {reportData.batchNumber} • Placed Chicks:{" "}
              {reportData.chicksPlaced}
            </Text>
          </View>

          {/* Metric clarification banner */}
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary,
            }}
          >
            <Text
              style={{ fontSize: 12, color: colors.text, fontWeight: "600" }}
            >
              ℹ️ Metric Standard:
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              • <Text style={{ fontWeight: "700" }}>TRUE FCR:</Text> total feed
              (kg) / total live weight (kg). Lower is better (target ~1.45 -
              1.55).
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              • <Text style={{ fontWeight: "700" }}>Farm method:</Text> live
              weight (kg) per bag of feed. Farm notebook legacy metric (~62.7 at
              W1).
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Header Row */}
              <View
                style={[
                  styles.gridHeaderRow,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[styles.colHeader, { width: 50, color: colors.white }]}
                >
                  Week
                </Text>
                <Text
                  style={[styles.colHeader, { width: 85, color: colors.white }]}
                >
                  Total Chicks
                </Text>
                <Text
                  style={[styles.colHeader, { width: 85, color: colors.white }]}
                >
                  Remaining
                </Text>
                <Text
                  style={[styles.colHeader, { width: 85, color: colors.white }]}
                >
                  Wk Feed (B)
                </Text>
                <Text
                  style={[styles.colHeader, { width: 85, color: colors.white }]}
                >
                  Tot Feed (B)
                </Text>
                <Text
                  style={[styles.colHeader, { width: 80, color: colors.white }]}
                >
                  Wk Mort
                </Text>
                <Text
                  style={[styles.colHeader, { width: 80, color: colors.white }]}
                >
                  Tot Mort
                </Text>
                <Text
                  style={[styles.colHeader, { width: 85, color: colors.white }]}
                >
                  Avg Wt (g)
                </Text>
                <Text
                  style={[styles.colHeader, { width: 95, color: colors.white }]}
                >
                  Tot Wt (kg)
                </Text>
                <Text
                  style={[
                    styles.colHeader,
                    { width: 90, color: "#a7f3d0", fontWeight: "800" },
                  ]}
                >
                  TRUE FCR
                </Text>
                <Text
                  style={[
                    styles.colHeader,
                    { width: 105, color: "#fed7aa", fontWeight: "800" },
                  ]}
                >
                  Farm method
                </Text>
              </View>

              {/* Data Rows */}
              {reportData.weeks?.map((w: any) => (
                <View
                  key={w.weekNumber}
                  style={[
                    styles.gridDataRow,
                    {
                      backgroundColor:
                        w.weekNumber % 2 === 0
                          ? "rgba(0,0,0,0.02)"
                          : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[styles.colCell, { width: 50, fontWeight: "700" }]}
                  >
                    W{w.weekNumber}
                  </Text>
                  <Text style={[styles.colCell, { width: 85 }]}>
                    {w.totalChicks?.toLocaleString()}
                  </Text>
                  <Text
                    style={[styles.colCell, { width: 85, fontWeight: "600" }]}
                  >
                    {w.remainingChicks?.toLocaleString()}
                  </Text>
                  <Text style={[styles.colCell, { width: 85 }]}>
                    {w.weeklyFeedBags}
                  </Text>
                  <Text
                    style={[styles.colCell, { width: 85, fontWeight: "600" }]}
                  >
                    {w.totalFeedBags}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 80, color: colors.danger },
                    ]}
                  >
                    {w.weeklyMortality}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 80, color: colors.danger, fontWeight: "600" },
                    ]}
                  >
                    {w.totalMortality}
                  </Text>
                  <Text style={[styles.colCell, { width: 85 }]}>
                    {w.averageWeightGrams} g
                  </Text>
                  <Text
                    style={[styles.colCell, { width: 95, fontWeight: "600" }]}
                  >
                    {w.totalWeightKg
                      ? `${w.totalWeightKg.toLocaleString()} kg`
                      : "-"}
                  </Text>
                  <Text
                    testID={`true-fcr-w${w.weekNumber}`}
                    style={[
                      styles.colCell,
                      { width: 90, fontWeight: "800", color: colors.success },
                    ]}
                  >
                    {w.trueFCR ? w.trueFCR.toFixed(2) : "-"}
                  </Text>
                  <Text
                    testID={`farm-method-w${w.weekNumber}`}
                    style={[
                      styles.colCell,
                      { width: 105, fontWeight: "800", color: colors.warning },
                    ]}
                  >
                    {w.farmMethodWeightPerBag
                      ? w.farmMethodWeightPerBag.toFixed(2)
                      : "-"}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      )}

      {/* 2. DAILY REGISTER (Paper Layout) */}
      {selectedReportType === "daily_paper" && reportData && (
        <Card elevated style={{ marginTop: 8 }}>
          <View style={{ marginBottom: 10 }}>
            <Text
              style={{ color: colors.primary, fontSize: 16, fontWeight: "800" }}
            >
              DAILY REGISTER (Rozana Register - 45 Days)
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Batch: {reportData.batchNumber} • Chicks:{" "}
              {reportData.chicksPlaced} • Custom Column:{" "}
              {reportData.customDailyColumnLabel || "E.S"}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View
                style={[
                  styles.gridHeaderRow,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text
                  style={[styles.colHeader, { width: 80, color: colors.white }]}
                >
                  Date
                </Text>
                <Text
                  style={[styles.colHeader, { width: 45, color: colors.white }]}
                >
                  Day
                </Text>
                <Text
                  style={[styles.colHeader, { width: 65, color: colors.white }]}
                >
                  Op Feed
                </Text>
                <Text
                  style={[styles.colHeader, { width: 65, color: colors.white }]}
                >
                  Feed Day
                </Text>
                <Text
                  style={[styles.colHeader, { width: 65, color: colors.white }]}
                >
                  Feed Ngt
                </Text>
                <Text
                  style={[styles.colHeader, { width: 65, color: colors.white }]}
                >
                  24h Feed
                </Text>
                <Text
                  style={[styles.colHeader, { width: 70, color: colors.white }]}
                >
                  Cum Feed
                </Text>
                <Text
                  style={[styles.colHeader, { width: 65, color: colors.white }]}
                >
                  Cls Feed
                </Text>
                <Text
                  style={[styles.colHeader, { width: 75, color: colors.white }]}
                >
                  Op Birds
                </Text>
                <Text
                  style={[styles.colHeader, { width: 60, color: colors.white }]}
                >
                  Mort Day
                </Text>
                <Text
                  style={[styles.colHeader, { width: 60, color: colors.white }]}
                >
                  Mort Ngt
                </Text>
                <Text
                  style={[styles.colHeader, { width: 60, color: colors.white }]}
                >
                  24h Mort
                </Text>
                <Text
                  style={[styles.colHeader, { width: 65, color: colors.white }]}
                >
                  Cum Mort
                </Text>
                <Text
                  style={[styles.colHeader, { width: 75, color: colors.white }]}
                >
                  Cls Birds
                </Text>
                <Text
                  style={[
                    styles.colHeader,
                    { width: 55, color: "#fef08a", fontWeight: "800" },
                  ]}
                >
                  {reportData.customDailyColumnLabel || "E.S"}
                </Text>
                <Text
                  style={[
                    styles.colHeader,
                    { width: 140, color: colors.white },
                  ]}
                >
                  Feed Remarks
                </Text>
              </View>

              {reportData.rows?.map((r: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.gridDataRow,
                    {
                      backgroundColor:
                        idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.colCell, { width: 80, fontSize: 11 }]}>
                    {r.date}
                  </Text>
                  <Text
                    style={[styles.colCell, { width: 45, fontWeight: "700" }]}
                  >
                    {r.dayNumber}
                  </Text>
                  <Text style={[styles.colCell, { width: 65 }]}>
                    {r.openingFeedStockBags}
                  </Text>
                  <Text style={[styles.colCell, { width: 65 }]}>
                    {r.feedUsedDayBags}
                  </Text>
                  <Text style={[styles.colCell, { width: 65 }]}>
                    {r.feedUsedNightBags}
                  </Text>
                  <Text
                    style={[styles.colCell, { width: 65, fontWeight: "700" }]}
                  >
                    {r.totalFeed24hBags}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 70, fontWeight: "700", color: colors.primary },
                    ]}
                  >
                    {r.cumulativeFeedBags}
                  </Text>
                  <Text style={[styles.colCell, { width: 65 }]}>
                    {r.closingFeedStockBags}
                  </Text>
                  <Text style={[styles.colCell, { width: 75 }]}>
                    {r.openingBirds?.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 60, color: colors.danger },
                    ]}
                  >
                    {r.mortalityDay}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 60, color: colors.danger },
                    ]}
                  >
                    {r.mortalityNight}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 60, color: colors.danger, fontWeight: "700" },
                    ]}
                  >
                    {r.totalMortality24h}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 65, color: colors.danger, fontWeight: "700" },
                    ]}
                  >
                    {r.cumulativeMortality}
                  </Text>
                  <Text
                    style={[styles.colCell, { width: 75, fontWeight: "700" }]}
                  >
                    {r.closingBirds?.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.colCell,
                      { width: 55, fontStyle: "italic", fontWeight: "600" },
                    ]}
                  >
                    {r.esColumnValue !== undefined && r.esColumnValue !== null
                      ? r.esColumnValue
                      : "-"}
                  </Text>
                  <Text
                    style={[styles.colCell, { width: 140, fontSize: 10 }]}
                    numberOfLines={1}
                  >
                    {r.feedRemarks || "-"}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      )}

      {/* 3. FEED PARTY LEDGER (In/Out in Bags) */}
      {selectedReportType === "party_ledger" && (
        <Card elevated style={{ marginTop: 8 }}>
          <View style={{ marginBottom: 10 }}>
            <Text
              style={{ color: colors.primary, fontSize: 16, fontWeight: "800" }}
            >
              FEED PARTY LEDGER (Bags Lent / Borrowed)
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Farms lend feed to each other in BAGS, not cash. Track running
              balances per party.
            </Text>
          </View>

          {partyLedgerData.length === 0 ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontStyle: "italic",
                marginVertical: 10,
              }}
            >
              No feed transfers recorded yet.
            </Text>
          ) : (
            partyLedgerData.map((p, idx) => (
              <View key={idx} style={styles.partyCard}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {p.partyName}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    Received: {p.bagsReceived} bags • Given out: {p.bagsGiven}{" "}
                    bags
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "800",
                      color:
                        p.netBalanceBags > 0
                          ? colors.success
                          : p.netBalanceBags < 0
                            ? colors.danger
                            : colors.text,
                    }}
                  >
                    {p.netBalanceBags > 0
                      ? `+${p.netBalanceBags} Bags`
                      : `${p.netBalanceBags} Bags`}
                  </Text>
                  <Badge
                    label={
                      p.netBalanceBags > 0
                        ? "Owes Us"
                        : p.netBalanceBags < 0
                          ? "We Owe"
                          : "Settled"
                    }
                    variant={
                      p.netBalanceBags > 0
                        ? "success"
                        : p.netBalanceBags < 0
                          ? "danger"
                          : "neutral"
                    }
                  />
                </View>
              </View>
            ))
          )}
        </Card>
      )}

      {/* 4. HISTORICAL CSV IMPORT VIEW */}
      {selectedReportType === "csv_import" && (
        <Card elevated style={{ marginTop: 8 }}>
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            Historical Paper Register CSV Import
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            Load past register rows into the database. Columns expected: Date,
            Day, OpenFeed, FeedDay, FeedNight, CloseFeed, OpenBirds, MortDay,
            MortNight, CloseBirds, ES, Remarks.
          </Text>

          <TextInput
            testID="csv-import-input"
            multiline
            numberOfLines={8}
            placeholder={`date,dayNumber,openingFeedStockBags,feedUsedDayBags,feedUsedNightBags,closingFeedStockBags,openingBirds,mortalityDay,mortalityNight,closingBirds,esColumnValue\n2026-03-01,1,100,5,4,91,19888,10,12,19866,0`}
            value={csvText}
            onChangeText={setCsvText}
            style={[
              styles.csvTextArea,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.surface,
              },
            ]}
          />

          <Button
            testID="submit-csv-import-btn"
            title={importing ? "Importing..." : "Validate & Import CSV Rows"}
            onPress={handleImportHistory}
            disabled={importing}
            style={{ marginTop: 12 }}
          />

          {importResult && (
            <View
              testID="import-result-card"
              style={{
                marginTop: 12,
                padding: 10,
                backgroundColor: "rgba(0,0,0,0.03)",
                borderRadius: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={colors.success}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: colors.success, fontWeight: "700" }}>
                  Successfully imported {importResult.importedRecords} of{" "}
                  {importResult.totalRows} rows
                </Text>
              </View>
              {importResult.errors?.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text
                    style={{
                      color: colors.danger,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Errors ({importResult.errors.length}):
                  </Text>
                  {importResult.errors.map((e: any, idx: number) => (
                    <Text
                      key={idx}
                      style={{ color: colors.danger, fontSize: 11 }}
                    >
                      Row {e.row}: {e.error}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </Card>
      )}

      {/* 5. STANDARD FLOCK REPORT */}
      {selectedReportType === "batch" && reportData?.metrics && (
        <Card elevated style={{ marginTop: 8 }}>
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 10,
            }}
          >
            FLOCK P&L & PERFORMANCE PREVIEW
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.cell}>
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "800",
                  fontSize: 16,
                }}
              >
                {reportData.metrics.fcr}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                TRUE FCR
              </Text>
            </View>
            <View style={styles.cell}>
              <Text
                style={{
                  color: colors.danger,
                  fontWeight: "800",
                  fontSize: 16,
                }}
              >
                {reportData.metrics.mortalityRate}%
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Mortality Rate
              </Text>
            </View>
            <View style={styles.cell}>
              <Text
                style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}
              >
                {reportData.metrics.totalFeedKg} kg
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Feed Consumed
              </Text>
            </View>
            <View style={styles.cell}>
              <Text
                style={{
                  color: colors.success,
                  fontWeight: "800",
                  fontSize: 16,
                }}
              >
                Rs. {reportData.metrics.netProfit?.toLocaleString()}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Net Profit
              </Text>
            </View>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  typeTab: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  batchChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  exportBar: {
    flexDirection: "row",
    marginVertical: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  cell: {
    alignItems: "center",
    flex: 1,
  },
  partyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  csvTextArea: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    minHeight: 120,
    textAlignVertical: "top",
    ...(Platform.OS === "web"
      ? ({
          outlineStyle: "none",
          outlineWidth: 0,
        } as any)
      : {}),
  },
  gridHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  gridDataRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  colHeader: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  colCell: {
    fontSize: 11,
    textAlign: "center",
  },
});
