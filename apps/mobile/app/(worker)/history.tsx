import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Card, Badge, Button, Input } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";

// Real historical Feed In & Feed Out entries matching the farm notebook (Photo 4)
const SAMPLE_FEED_IN = [
  {
    id: "in-1",
    date: "15-May-25",
    millParty: "Star Feed (Starter 11)",
    bags: 200,
    vehicleNo: "GL-4821",
    receivedBy: "Ali Ahmed",
  },
  {
    id: "in-2",
    date: "20-May-25",
    millParty: "Chenab Feed (Grower 12)",
    bags: 150,
    vehicleNo: "FD-7182",
    receivedBy: "Ali Ahmed",
  },
  {
    id: "in-3",
    date: "24-May-25",
    millParty: "Crystal Grower Feed",
    bags: 200,
    vehicleNo: "LR-9920",
    receivedBy: "Ali Ahmed",
  },
  {
    id: "in-4",
    date: "01-Jun-25",
    millParty: "Amigo Feed (Feed Mill)",
    bags: 31,
    vehicleNo: "Local Carry",
    receivedBy: "Ali Ahmed",
  },
  {
    id: "in-5",
    date: "04-Jun-25",
    millParty: "Chenab Feed (Finisher)",
    bags: 150,
    vehicleNo: "GL-3341",
    receivedBy: "Ali Ahmed",
  },
];

const SAMPLE_FEED_OUT = [
  {
    id: "out-1",
    date: "25-May-25",
    recipientParty: "Dr. Ahsan (Transfer)",
    bags: 75,
    reason: "Shortage at Farm B",
  },
  {
    id: "out-2",
    date: "27-May-25",
    recipientParty: "Kunjah Farm (Shed 2)",
    bags: 58,
    reason: "30 bags Grower + 28 bags Starter",
  },
  {
    id: "out-3",
    date: "02-Jun-25",
    recipientParty: "Rizwan Sab (Personal)",
    bags: 100,
    reason: "Feed mill direct transfer",
  },
  {
    id: "out-4",
    date: "06-Jun-25",
    recipientParty: "Kunjah Farm (Shed 3)",
    bags: 48,
    reason: "Shed transfer",
  },
];

export default function WorkerHistoryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();

  const [activeTab, setActiveTab] = useState<"in" | "out" | "daily">("in");
  const [feedInList, setFeedInList] = useState(SAMPLE_FEED_IN);
  const [feedOutList, setFeedOutList] = useState(SAMPLE_FEED_OUT);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Feed Transaction Modal / Card
  const [showAddModal, setShowAddModal] = useState(false);
  const [transType, setTransType] = useState<"in" | "out">("in");
  const [partyName, setPartyName] = useState("");
  const [bagCount, setBagCount] = useState("");
  const [transRemarks, setTransRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shedId = user?.assignedShedId || user?.shed?.id;

  const loadData = async () => {
    try {
      if (shedId) {
        const res = await apiFetch(`/api/daily-records?shedId=${shedId}`);
        if (res.success && res.data) {
          setDailyRecords(res.data);
        } else {
          const cached = await OfflineStore.getLocalCache("DAILY_RECORD");
          setDailyRecords(cached);
        }
      }
    } catch {
      const cached = await OfflineStore.getLocalCache("DAILY_RECORD");
      setDailyRecords(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shedId]);

  // Stock summary calculation
  const totalBagsIn = feedInList.reduce((sum, item) => sum + item.bags, 0);
  const totalBagsOut = feedOutList.reduce((sum, item) => sum + item.bags, 0);
  // Estimate consumed based on mock or real
  const totalConsumedEstimate = 508; // Day 23 cumulative
  const currentAvailableBags = Math.max(0, totalBagsIn - totalBagsOut - totalConsumedEstimate);

  const handleSaveTransaction = async () => {
    const numBags = parseInt(bagCount, 10);
    if (!partyName.trim() || !numBags || numBags <= 0) {
      Alert.alert("Required", "Party ka naam aur borian darj karein.");
      return;
    }

    setSubmitting(true);
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });

    try {
      if (transType === "in") {
        const newIn = {
          id: `in-${Date.now()}`,
          date: todayStr,
          millParty: partyName.trim(),
          bags: numBags,
          vehicleNo: transRemarks.trim() || "Local",
          receivedBy: user?.name || "Worker",
        };
        setFeedInList([newIn, ...feedInList]);
      } else {
        const newOut = {
          id: `out-${Date.now()}`,
          date: todayStr,
          recipientParty: partyName.trim(),
          bags: numBags,
          reason: transRemarks.trim() || "Transfer",
        };
        setFeedOutList([newOut, ...feedOutList]);
      }

      await OfflineStore.enqueueMutation("FEED_LEDGER", "CREATE", {
        type: transType,
        party: partyName.trim(),
        bags: numBags,
        date: todayStr,
        remarks: transRemarks.trim(),
        shedId,
      });

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn(e),
        );
      }

      Alert.alert(
        "Mehfooz Ho Gaya!",
        `${numBags} borian ${transType === "in" ? "Aamad (Feed In)" : "Rawangi (Feed Out)"} mein darj ho gayi hain.`,
      );
      setShowAddModal(false);
      setPartyName("");
      setBagCount("");
      setTransRemarks("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          padding: spacing.base,
          maxWidth: 900,
          alignSelf: "center",
          width: "100%",
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Screen Title */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="clipboard-list-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.bold,
                },
              ]}
            >
              📦 Khuraak Ledger (Feed In / Out)
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.xs,
              marginTop: 2,
            }}
          >
            Notebook Khata (Photo 4) • Feed Aamad (In) aur Rawangi (Out)
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowAddModal(!showAddModal)}
          style={[
            styles.addBtn,
            {
              backgroundColor: showAddModal ? colors.surface : colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name={showAddModal ? "close" : "add-circle-outline"}
            size={16}
            color={showAddModal ? colors.primary : "#FFFFFF"}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              color: showAddModal ? colors.primary : "#FFFFFF",
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            {showAddModal ? "Band Karein" : "➕ Feed Entry"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stock Overview Cards (Khata Balance) */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
          ]}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#047857" }}>
            TOTAL FEED IN
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#065F46" }}>
            {totalBagsIn}
          </Text>
          <Text style={{ fontSize: 10, color: "#047857" }}>Bags (Aamad)</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: "#FEF2F2", borderColor: "#EF4444" },
          ]}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#B91C1C" }}>
            TOTAL FEED OUT
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#991B1B" }}>
            {totalBagsOut}
          </Text>
          <Text style={{ fontSize: 10, color: "#B91C1C" }}>Bags (Transfer)</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
          ]}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#1D4ED8" }}>
            AVAILABLE STOCK
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#1E40AF" }}>
            {currentAvailableBags}
          </Text>
          <Text style={{ fontSize: 10, color: "#1D4ED8" }}>Bags in Shed</Text>
        </View>
      </View>

      {/* Add Feed Transaction Modal/Card */}
      {showAddModal && (
        <View
          style={[
            styles.addCardBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text
            style={{
              fontSize: typography.sizes.base,
              fontWeight: typography.weights.bold,
              color: colors.primary,
              marginBottom: 8,
            }}
          >
            ➕ Nayi Feed Entry Darj Karein
          </Text>

          {/* In vs Out Toggle */}
          <View style={styles.transTypeRow}>
            <TouchableOpacity
              onPress={() => setTransType("in")}
              style={[
                styles.typeToggleBtn,
                {
                  backgroundColor:
                    transType === "in" ? colors.primary : colors.surface,
                  borderColor:
                    transType === "in" ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: transType === "in" ? "#fff" : colors.text,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                📥 Feed Aayi (In)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTransType("out")}
              style={[
                styles.typeToggleBtn,
                {
                  backgroundColor:
                    transType === "out" ? colors.danger : colors.surface,
                  borderColor:
                    transType === "out" ? colors.danger : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: transType === "out" ? "#fff" : colors.text,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                📤 Feed Gayi (Out)
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label={
              transType === "in"
                ? "Feed Mill / Party (e.g. Star Feed, Chenab)"
                : "Recipient Party / Shed (e.g. Dr. Ahsan, Shed 2)"
            }
            placeholder={
              transType === "in"
                ? "e.g. Star Feed Grower"
                : "e.g. Dr. Ahsan / Kunjah Farm"
            }
            value={partyName}
            onChangeText={setPartyName}
          />

          <Input
            label="Borian (Bags Count)"
            placeholder="e.g. 100"
            value={bagCount}
            onChangeText={setBagCount}
            keyboardType="numeric"
            suffix="Bags"
          />

          <Input
            label={
              transType === "in"
                ? "Gari Number / Bilty / Note"
                : "Wajah / Transfer Remarks"
            }
            placeholder="e.g. Vehicle # GL-4821"
            value={transRemarks}
            onChangeText={setTransRemarks}
          />

          <View style={{ marginTop: 8 }}>
            <Button
              title={
                submitting
                  ? "Mehfooz Ho Raha Hai..."
                  : "📋 Ledger Mein Darj Karein"
              }
              onPress={handleSaveTransaction}
              loading={submitting}
              size="md"
            />
          </View>
        </View>
      )}

      {/* Tabs Switcher: Feed In | Feed Out | Daily Records */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("in")}
          style={[
            styles.tabItem,
            activeTab === "in" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "in" ? colors.primary : colors.textMuted,
                fontWeight: activeTab === "in" ? "800" : "600",
              },
            ]}
          >
            📥 Feed Aayi (In) ({feedInList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("out")}
          style={[
            styles.tabItem,
            activeTab === "out" && {
              borderBottomColor: colors.danger,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "out" ? colors.danger : colors.textMuted,
                fontWeight: activeTab === "out" ? "800" : "600",
              },
            ]}
          >
            📤 Feed Gayi (Out) ({feedOutList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("daily")}
          style={[
            styles.tabItem,
            activeTab === "daily" && {
              borderBottomColor: colors.text,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "daily" ? colors.text : colors.textMuted,
                fontWeight: activeTab === "daily" ? "800" : "600",
              },
            ]}
          >
            📜 Rozana Khata ({dailyRecords.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* TAB 1: FEED IN TABLE (PHOTO 4 PAGE 1) */}
      {/* ========================================================================= */}
      {activeTab === "in" && (
        <View style={styles.tableCard}>
          <View style={[styles.tableHeader, { backgroundColor: "#1E293B" }]}>
            <View style={[styles.tCol, { width: 85 }]}>
              <Text style={styles.tHeadText}>DATE</Text>
            </View>
            <View style={[styles.tCol, { flex: 1 }]}>
              <Text style={[styles.tHeadText, { textAlign: "left" }]}>
                DESCRIPTION & PARTY
              </Text>
            </View>
            <View style={[styles.tCol, { width: 75 }]}>
              <Text style={styles.tHeadText}>BAGS</Text>
            </View>
            <View style={[styles.tCol, { width: 90 }]}>
              <Text style={styles.tHeadText}>VEHICLE</Text>
            </View>
          </View>

          {feedInList.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                {
                  backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                  borderBottomColor: "#E2E8F0",
                },
              ]}
            >
              <View style={[styles.tCol, { width: 85 }]}>
                <Text style={styles.tCellBold}>{item.date}</Text>
              </View>
              <View
                style={[styles.tCol, { flex: 1, alignItems: "flex-start" }]}
              >
                <Text style={styles.tCellText}>{item.millParty}</Text>
              </View>
              <View style={[styles.tCol, { width: 75 }]}>
                <Text
                  style={[
                    styles.tCellBold,
                    { color: "#059669", fontSize: 13 },
                  ]}
                >
                  +{item.bags}
                </Text>
              </View>
              <View style={[styles.tCol, { width: 90 }]}>
                <Text style={styles.tCellMuted}>{item.vehicleNo}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FEED OUT TABLE (PHOTO 4 PAGE 2) */}
      {/* ========================================================================= */}
      {activeTab === "out" && (
        <View style={styles.tableCard}>
          <View style={[styles.tableHeader, { backgroundColor: "#1E293B" }]}>
            <View style={[styles.tCol, { width: 85 }]}>
              <Text style={styles.tHeadText}>DATE</Text>
            </View>
            <View style={[styles.tCol, { flex: 1 }]}>
              <Text style={[styles.tHeadText, { textAlign: "left" }]}>
                PARTY / SHED
              </Text>
            </View>
            <View style={[styles.tCol, { width: 75 }]}>
              <Text style={styles.tHeadText}>BAGS</Text>
            </View>
            <View style={[styles.tCol, { width: 110 }]}>
              <Text style={styles.tHeadText}>REMARKS</Text>
            </View>
          </View>

          {feedOutList.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                {
                  backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                  borderBottomColor: "#E2E8F0",
                },
              ]}
            >
              <View style={[styles.tCol, { width: 85 }]}>
                <Text style={styles.tCellBold}>{item.date}</Text>
              </View>
              <View
                style={[styles.tCol, { flex: 1, alignItems: "flex-start" }]}
              >
                <Text style={styles.tCellText}>{item.recipientParty}</Text>
              </View>
              <View style={[styles.tCol, { width: 75 }]}>
                <Text
                  style={[
                    styles.tCellBold,
                    { color: "#DC2626", fontSize: 13 },
                  ]}
                >
                  -{item.bags}
                </Text>
              </View>
              <View style={[styles.tCol, { width: 110 }]}>
                <Text style={styles.tCellMuted} numberOfLines={1}>
                  {item.reason}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DAILY RECORDS HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "daily" && (
        <View style={{ marginTop: 6 }}>
          {dailyRecords.length === 0 ? (
            <Card style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary }}>
                Koi past daily entry nahi mili.
              </Text>
            </Card>
          ) : (
            dailyRecords.map((record) => (
              <Card
                key={record._id || record.id || record.date}
                style={{ marginVertical: 4 }}
                elevated
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: typography.sizes.base,
                        fontWeight: typography.weights.bold,
                      }}
                    >
                      {record.date} (Day {record.ageInDays})
                    </Text>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: typography.sizes.xs,
                      }}
                    >
                      Logged by {record.createdBy?.name || user?.name || "Worker"}
                    </Text>
                  </View>
                  <Badge
                    label={record.isLocked ? "LOCKED" : "EDITABLE"}
                    variant={record.isLocked ? "neutral" : "success"}
                    size="sm"
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 8,
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Feed:{" "}
                    <Text style={{ fontWeight: "700", color: colors.primary }}>
                      {record.feedUsedBags || 0} bags
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Mortality:{" "}
                    <Text style={{ fontWeight: "700", color: colors.danger }}>
                      {record.mortalityCount || 0} birds
                    </Text>
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {},
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  addCardBox: {
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  transTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
  },
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  tabText: {
    fontSize: 12,
  },
  tableCard: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  tHeadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    minHeight: 38,
  },
  tCol: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  tCellBold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  tCellText: {
    fontSize: 11,
    color: "#334155",
  },
  tCellMuted: {
    fontSize: 10,
    color: "#64748B",
  },
});
