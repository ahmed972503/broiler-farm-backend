import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Button, Input, Card, Badge } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { bagsToKg } from "@broiler/shared";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../src/i18n";

export default function DailyEntryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const todayStr = new Date().toISOString().split("T")[0];

  const [currentLang, setCurrentLang] = useState<"ur" | "en">(
    (i18n.language as "ur" | "en") || "ur",
  );
  const [date, setDate] = useState(todayStr);
  const [shift, setShift] = useState<"day" | "night" | "full">("day");

  // Shift-specific Feed
  const [feedDayBags, setFeedDayBags] = useState("4");
  const [feedNightBags, setFeedNightBags] = useState("4");
  const [openingStockBags, setOpeningStockBags] = useState("50");
  const [receivedBags, setReceivedBags] = useState("0");
  const [transferredOutBags, setTransferredOutBags] = useState("0");
  const [reportedClosingBags, setReportedClosingBags] = useState("");
  const [feedRemarks, setFeedRemarks] = useState("");

  // Shift-specific Mortality
  const [mortDay, setMortDay] = useState("0");
  const [mortDayCause, setMortDayCause] = useState("");
  const [mortNight, setMortNight] = useState("0");
  const [mortNightCause, setMortNightCause] = useState("");
  const [culls, setCulls] = useState("0");

  // Unconfirmed paper column "E.S"
  const [customColumnES, setCustomColumnES] = useState("");

  const [feedType, setFeedType] = useState<"starter" | "grower" | "finisher">(
    "grower",
  );
  const [waterLiters, setWaterLiters] = useState("600");
  const [minTemp, setMinTemp] = useState("24.0");
  const [maxTemp, setMaxTemp] = useState("30.5");
  const [litter, setLitter] = useState<"dry" | "normal" | "wet">("normal");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchId, setBatchId] = useState<string>("");
  const [savedOfflineNotice, setSavedOfflineNotice] = useState(false);

  useEffect(() => {
    const fetchShedBatch = async () => {
      const shedId = user?.assignedShedId || user?.shed?.id;
      if (shedId) {
        try {
          const res = await apiFetch(`/api/sheds/${shedId}`);
          if (res.success && res.data?.currentBatchId) {
            setBatchId(res.data.currentBatchId);
          } else if (res.data?.activeBatch?._id) {
            setBatchId(res.data.activeBatch._id);
          }
        } catch (e) {
          // Offline fallback
          setBatchId("active-batch-offline");
        }
      }
    };
    fetchShedBatch();
  }, [user]);

  const toggleLanguage = () => {
    const nextLang = currentLang === "ur" ? "en" : "ur";
    changeLanguage(nextLang);
    setCurrentLang(nextLang);
  };

  // Fast Touch Steppers
  const adjustMortDay = (val: number) => {
    const curr = parseInt(mortDay, 10) || 0;
    setMortDay(Math.max(0, curr + val).toString());
  };

  const adjustMortNight = (val: number) => {
    const curr = parseInt(mortNight, 10) || 0;
    setMortNight(Math.max(0, curr + val).toString());
  };

  const adjustFeedDay = (val: number) => {
    const curr = parseFloat(feedDayBags) || 0;
    setFeedDayBags(Math.max(0, curr + val).toString());
  };

  const adjustFeedNight = (val: number) => {
    const curr = parseFloat(feedNightBags) || 0;
    setFeedNightBags(Math.max(0, curr + val).toString());
  };

  // 24h Totals
  const numFeedDay = parseFloat(feedDayBags) || 0;
  const numFeedNight = parseFloat(feedNightBags) || 0;
  const totalFeed24h =
    shift === "day"
      ? numFeedDay
      : shift === "night"
        ? numFeedNight
        : numFeedDay + numFeedNight;
  const calculatedKg = bagsToKg(totalFeed24h);

  const numMortDay = parseInt(mortDay, 10) || 0;
  const numMortNight = parseInt(mortNight, 10) || 0;
  const totalMort24h =
    shift === "day"
      ? numMortDay
      : shift === "night"
        ? numMortNight
        : numMortDay + numMortNight;

  // Stock Reconciliation
  const numOpening = parseFloat(openingStockBags) || 0;
  const numReceived = parseFloat(receivedBags) || 0;
  const numTransferOut = parseFloat(transferredOutBags) || 0;
  const expectedClosing = Math.max(
    0,
    numOpening - totalFeed24h + numReceived - numTransferOut,
  );
  const reportedClosingNum =
    reportedClosingBags !== ""
      ? parseFloat(reportedClosingBags)
      : expectedClosing;
  const hasShortage =
    reportedClosingBags !== "" && reportedClosingNum < expectedClosing - 0.01;

  const handleSubmit = async () => {
    const shedId = user?.assignedShedId || user?.shed?.id;
    if (!shedId) {
      Alert.alert("Error", "Worker has no assigned shed.");
      return;
    }

    setLoading(true);

    const payload = {
      batchId: batchId || "batch-active",
      shedId,
      date,
      shift,
      // Shift Feed
      feedUsedDayShiftBags: shift === "night" ? 0 : numFeedDay,
      feedUsedNightShiftBags: shift === "day" ? 0 : numFeedNight,
      feedUsedBags: totalFeed24h,
      feedUsedKg: calculatedKg,
      openingFeedStockBags: numOpening,
      feedReceivedBags: numReceived,
      feedTransferredOutBags: numTransferOut,
      closingFeedStockBags: reportedClosingNum,
      feedRemarks: feedRemarks.trim(),
      // Shift Mortality
      mortalityDayShift: shift === "night" ? 0 : numMortDay,
      mortalityDayCause: mortDayCause.trim(),
      mortalityNightShift: shift === "day" ? 0 : numMortNight,
      mortalityNightCause: mortNightCause.trim(),
      mortalityCount: totalMort24h,
      culls: parseInt(culls, 10) || 0,
      // Paper "E.S" column
      customColumnES: customColumnES !== "" ? parseFloat(customColumnES) : null,
      feedType,
      waterLiters: parseFloat(waterLiters) || 0,
      minTemp: parseFloat(minTemp) || 24,
      maxTemp: parseFloat(maxTemp) || 30,
      litterCondition: litter,
      notes: notes.trim(),
    };

    try {
      // 1. Enqueue to OfflineStore immediately (offline-first write)
      await OfflineStore.enqueueMutation("DAILY_RECORD", "CREATE", payload);
      setSavedOfflineNotice(true);

      // 2. Background sync attempt if connected
      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn("Background sync", e),
        );
      }

      Alert.alert(
        "Mehfooz Ho Gaya! (Saved)",
        "Rozana khata kamyabi se phone mein mehfooz ho gaya hai.",
        [
          {
            text: "Theek Hai (OK)",
            onPress: () => router.replace("/(worker)/today"),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      testID="daily-entry-scroll-view"
    >
      {/* Top Bar with Language Switcher */}
      <View style={styles.topBar}>
        <View>
          <Text
            style={[
              styles.screenTitle,
              {
                color: colors.text,
                fontSize: typography.sizes.xl,
                fontWeight: typography.weights.bold,
              },
            ]}
          >
            {t("daily.title")}
          </Text>
          <Text
            style={[
              styles.screenSubtitle,
              {
                color: colors.textSecondary,
                fontSize: typography.sizes.sm,
              },
            ]}
          >
            {date} • Tareekh (Date)
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleLanguage}
          testID="language-toggle-btn"
          style={[
            styles.langPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text
            style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}
          >
            🌐 {currentLang === "ur" ? "English" : "Roman Urdu"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Saved Offline Banner */}
      {savedOfflineNotice && (
        <Card
          testID="saved-offline-banner"
          style={{
            backgroundColor: "#E8F5E9",
            borderColor: "#4CAF50",
            marginBottom: spacing.md,
            borderWidth: 1.5,
          }}
        >
          <Text style={{ color: "#2E7D32", fontWeight: "700", fontSize: 14 }}>
            ✓ Mehfooz Ho Gaya! (Saved Offline)
          </Text>
          <Text style={{ color: "#388E3C", fontSize: 12, marginTop: 2 }}>
            Record local SQLite database mein safe hai aur online hote hi sync
            ho jaye ga.
          </Text>
        </Card>
      )}

      {/* Shift Switcher */}
      <View style={[styles.shiftRow, { marginVertical: spacing.sm }]}>
        {[
          { key: "day", label: "Din Ka Shift (DAY)" },
          { key: "night", label: "Raat Ka Shift (NIGHT)" },
          { key: "full", label: "Poora Din (24h FULL)" },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setShift(s.key as any)}
            testID={`shift-tab-${s.key}`}
            style={[
              styles.shiftTab,
              {
                backgroundColor:
                  shift === s.key ? colors.primary : colors.surface,
                borderColor: shift === s.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: shift === s.key ? "#fff" : colors.text,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 1. Mortality Section */}
      <Card elevated>
        <Text
          style={[
            styles.cardHeader,
            {
              color: colors.danger,
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          💀 {t("daily.mortality")} (Mout / Mortality)
        </Text>

        {(shift === "day" || shift === "full") && (
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Din Ki Mout (Day Shift Mortality Count):
            </Text>
            <View style={styles.quickCounterRow}>
              <TouchableOpacity
                onPress={() => adjustMortDay(1)}
                testID="mort-day-plus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustMortDay(5)}
                testID="mort-day-plus-5"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+5</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustMortDay(-1)}
                testID="mort-day-minus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>-1</Text>
              </TouchableOpacity>
            </View>
            <Input
              testID="mort-day-input"
              placeholder="0"
              value={mortDay}
              onChangeText={setMortDay}
              keyboardType="number-pad"
              suffix={t("common.birds")}
              inputStyle={styles.bigNumericInput}
            />
            <Input
              testID="mort-day-cause-input"
              label="Din Ki Wajah (Day Cause)"
              placeholder="e.g. Garmi, Kamzori"
              value={mortDayCause}
              onChangeText={setMortDayCause}
            />
          </View>
        )}

        {(shift === "night" || shift === "full") && (
          <View style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Raat Ki Mout (Night Shift Mortality Count):
            </Text>
            <View style={styles.quickCounterRow}>
              <TouchableOpacity
                onPress={() => adjustMortNight(1)}
                testID="mort-night-plus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustMortNight(5)}
                testID="mort-night-plus-5"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+5</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustMortNight(-1)}
                testID="mort-night-minus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>-1</Text>
              </TouchableOpacity>
            </View>
            <Input
              testID="mort-night-input"
              placeholder="0"
              value={mortNight}
              onChangeText={setMortNight}
              keyboardType="number-pad"
              suffix={t("common.birds")}
              inputStyle={styles.bigNumericInput}
            />
            <Input
              testID="mort-night-cause-input"
              label="Raat Ki Wajah (Night Cause)"
              placeholder="e.g. Saans ka masla, Dhakka"
              value={mortNightCause}
              onChangeText={setMortNightCause}
            />
          </View>
        )}

        <Input
          testID="culls-input"
          label={t("daily.culls") + " (Zaya / Kamzor)"}
          placeholder="0"
          value={culls}
          onChangeText={setCulls}
          keyboardType="number-pad"
          suffix={t("common.birds")}
        />

        <View style={styles.summaryBadgeRow}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>
            24h Mortality Total: {totalMort24h} birds
          </Text>
        </View>
      </Card>

      {/* 2. Feed Section */}
      <Card elevated style={{ marginTop: spacing.md }}>
        <Text
          style={[
            styles.cardHeader,
            {
              color: colors.primary,
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          🌾 {t("daily.feedUsedBags")} (Daana / Khorak)
        </Text>

        {/* Feed Type Selector */}
        <View style={styles.selectorRow}>
          {(["starter", "grower", "finisher"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setFeedType(type)}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    feedType === type ? colors.primary : colors.surface,
                  borderColor:
                    feedType === type ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: feedType === type ? "#fff" : colors.text,
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(shift === "day" || shift === "full") && (
          <View style={{ marginVertical: spacing.xs }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Din Ki Khorak (Day Shift Bags):
            </Text>
            <View style={styles.quickCounterRow}>
              <TouchableOpacity
                onPress={() => adjustFeedDay(1)}
                testID="feed-day-plus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+1 Bag</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustFeedDay(5)}
                testID="feed-day-plus-5"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+5 Bags</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustFeedDay(-1)}
                testID="feed-day-minus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>-1 Bag</Text>
              </TouchableOpacity>
            </View>
            <Input
              testID="feed-day-input"
              placeholder="0"
              value={feedDayBags}
              onChangeText={setFeedDayBags}
              keyboardType="numeric"
              suffix="Bags"
              inputStyle={styles.bigNumericInput}
            />
          </View>
        )}

        {(shift === "night" || shift === "full") && (
          <View style={{ marginVertical: spacing.xs }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Raat Ki Khorak (Night Shift Bags):
            </Text>
            <View style={styles.quickCounterRow}>
              <TouchableOpacity
                onPress={() => adjustFeedNight(1)}
                testID="feed-night-plus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+1 Bag</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustFeedNight(5)}
                testID="feed-night-plus-5"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>+5 Bags</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => adjustFeedNight(-1)}
                testID="feed-night-minus-1"
                style={[styles.stepperButton, { borderColor: colors.border }]}
              >
                <Text style={styles.stepperText}>-1 Bag</Text>
              </TouchableOpacity>
            </View>
            <Input
              testID="feed-night-input"
              placeholder="0"
              value={feedNightBags}
              onChangeText={setFeedNightBags}
              keyboardType="numeric"
              suffix="Bags"
              inputStyle={styles.bigNumericInput}
            />
          </View>
        )}

        {/* 24h Feed Total Callout */}
        <View
          style={[styles.metricCallout, { backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            24h Feed:{" "}
            <Text style={{ fontWeight: "700", color: colors.primary }}>
              {totalFeed24h} Bags
            </Text>{" "}
            ({calculatedKg} kg)
          </Text>
        </View>

        {/* Feed Stock Reconciliation */}
        <View
          style={{
            marginTop: spacing.md,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: spacing.sm,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: colors.text, marginBottom: 6 }}
          >
            Stock Reconciliation (Borian Ka Hisab)
          </Text>
          <View style={styles.stockRow}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Input
                testID="feed-opening-input"
                label="Opening Stock"
                value={openingStockBags}
                onChangeText={setOpeningStockBags}
                keyboardType="numeric"
                suffix="Bags"
              />
            </View>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Input
                testID="feed-received-input"
                label="+ Aamad (Received)"
                value={receivedBags}
                onChangeText={setReceivedBags}
                keyboardType="numeric"
                suffix="Bags"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                testID="feed-transfer-out-input"
                label="- Diya (Transfer)"
                value={transferredOutBags}
                onChangeText={setTransferredOutBags}
                keyboardType="numeric"
                suffix="Bags"
              />
            </View>
          </View>

          <Input
            testID="feed-closing-input"
            label="Reported Closing Stock (Shed mein bachi hui borian)"
            placeholder={expectedClosing.toString()}
            value={reportedClosingBags}
            onChangeText={setReportedClosingBags}
            keyboardType="numeric"
            suffix="Bags"
          />

          {hasShortage && (
            <Badge
              testID="feed-shortage-badge"
              label={`⚠️ STOCK SHORTAGE DETECTED (Expected: ${expectedClosing} bags, Reported: ${reportedClosingNum} bags)`}
              variant="danger"
              style={{ marginTop: 4 }}
            />
          )}

          <Input
            testID="feed-remarks-input"
            label="Feed In/Out Remarks"
            placeholder="e.g. 5 bags Star Feed borrowed from Shed 2"
            value={feedRemarks}
            onChangeText={setFeedRemarks}
          />
        </View>
      </Card>

      {/* 3. Paper Register Unconfirmed Column "E.S" */}
      <Card elevated style={{ marginTop: spacing.md }}>
        <Text
          style={[
            styles.cardHeader,
            {
              color: colors.secondary,
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          📝 Paper Register Custom Column ("E.S")
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}
        >
          Register ka khas column (Formula se bahir hai - sirf record ke liye):
        </Text>
        <Input
          testID="custom-column-es-input"
          label="E.S Value (Optional)"
          placeholder="0"
          value={customColumnES}
          onChangeText={setCustomColumnES}
          keyboardType="numeric"
        />
      </Card>

      {/* 4. Shed Environment (Paani, Temp, Bedding) */}
      <Card elevated style={{ marginTop: spacing.md }}>
        <Text
          style={[
            styles.cardHeader,
            {
              color: colors.text,
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          🌡️ Environment (Mahol)
        </Text>

        <Input
          testID="water-liters-input"
          label={t("daily.waterLiters")}
          placeholder="600"
          value={waterLiters}
          onChangeText={setWaterLiters}
          keyboardType="numeric"
          suffix={t("common.liters")}
        />

        <View style={styles.stockRow}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Input
              testID="min-temp-input"
              label="Min Temp (°C)"
              value={minTemp}
              onChangeText={setMinTemp}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              testID="max-temp-input"
              label="Max Temp (°C)"
              value={maxTemp}
              onChangeText={setMaxTemp}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text
          style={[
            styles.inputLabel,
            { color: colors.textSecondary, marginTop: 6 },
          ]}
        >
          {t("daily.litter")}
        </Text>
        <View style={styles.selectorRow}>
          {(["dry", "normal", "wet"] as const).map((cond) => (
            <TouchableOpacity
              key={cond}
              onPress={() => setLitter(cond)}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    litter === cond ? colors.secondary : colors.surface,
                  borderColor:
                    litter === cond ? colors.secondary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: litter === cond ? "#fff" : colors.text,
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
              >
                {cond}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          testID="daily-notes-input"
          label={t("common.notes")}
          placeholder={t("daily.notesPlaceholder")}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />
      </Card>

      {/* Submit Button */}
      <View style={{ marginTop: spacing.lg }}>
        <Button
          testID="submit-daily-entry-btn"
          title={
            loading
              ? t("common.loading")
              : "✓ " + t("common.save") + " (Darj Karein)"
          }
          onPress={handleSubmit}
          loading={loading}
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  screenTitle: {},
  screenSubtitle: {},
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  shiftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shiftTab: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  cardHeader: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  quickCounterRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  stepperButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 3,
    backgroundColor: "#F3F4F6",
  },
  stepperText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#1F2937",
  },
  bigNumericInput: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  summaryBadgeRow: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
  },
  selectorRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  typeChip: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
  },
  metricCallout: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    marginVertical: 4,
  },
  stockRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
});
