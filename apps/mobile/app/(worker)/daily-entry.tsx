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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Button, Input, Card, Badge } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { bagsToKg } from "@broiler/shared";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../src/i18n";

// Real flock historical sample rows matching the farm notebook (Photos 1 & 5)
const SAMPLE_REGISTER_ROWS = [
  {
    date: "18-May-25",
    day: 23,
    sfOpen: 315,
    feedDay: 19,
    feedNight: 19,
    feed24h: 38,
    totalFeed: 508,
    sfClose: 277,
    feedRemarks: "",
    birdsOpen: 19576,
    mortDay: 15,
    mortNight: 8,
    mort24h: 23,
    totalMort: 336,
    birdsClose: 19553,
    es: 5,
  },
  {
    date: "19-May-25",
    day: 24,
    sfOpen: 277,
    feedDay: 19,
    feedNight: 20,
    feed24h: 39,
    totalFeed: 547,
    sfClose: 238,
    feedRemarks: "",
    birdsOpen: 19553,
    mortDay: 13,
    mortNight: 17,
    mort24h: 30,
    totalMort: 366,
    birdsClose: 19523,
    es: "-",
  },
  {
    date: "20-May-25",
    day: 25,
    sfOpen: 238,
    feedDay: 20,
    feedNight: 22,
    feed24h: 42,
    totalFeed: 589,
    sfClose: 196,
    feedRemarks: "",
    birdsOpen: 19523,
    mortDay: 45,
    mortNight: 22,
    mort24h: 67,
    totalMort: 433,
    birdsClose: 19456,
    es: "-",
  },
  {
    date: "21-May-25",
    day: 26,
    sfOpen: 196,
    feedDay: 22,
    feedNight: 23,
    feed24h: 45,
    totalFeed: 634,
    sfClose: 151,
    feedRemarks: "",
    birdsOpen: 19456,
    mortDay: 36,
    mortNight: 36,
    mort24h: 72,
    totalMort: 505,
    birdsClose: 19384,
    es: "-",
  },
  {
    date: "22-May-25",
    day: 27,
    sfOpen: 151,
    feedDay: 23,
    feedNight: 23,
    feed24h: 46,
    totalFeed: 680,
    sfClose: 305,
    feedRemarks: "+200 bags Crystal Grower",
    birdsOpen: 19384,
    mortDay: 45,
    mortNight: 72,
    mort24h: 117,
    totalMort: 622,
    birdsClose: 19267,
    es: 25,
  },
  {
    date: "23-May-25",
    day: 28,
    sfOpen: 305,
    feedDay: 25,
    feedNight: 24,
    feed24h: 49,
    totalFeed: 729,
    sfClose: 356,
    feedRemarks: "+100 Chenab Grower",
    birdsOpen: 19267,
    mortDay: 54,
    mortNight: 78,
    mort24h: 132,
    totalMort: 754,
    birdsClose: 19135,
    es: 8,
  },
  {
    date: "24-May-25",
    day: 29,
    sfOpen: 356,
    feedDay: 25,
    feedNight: 25,
    feed24h: 50,
    totalFeed: 779,
    sfClose: 306,
    feedRemarks: "",
    birdsOpen: 19135,
    mortDay: 54,
    mortNight: 61,
    mort24h: 115,
    totalMort: 869,
    birdsClose: 18935,
    es: "-",
  },
  {
    date: "25-May-25",
    day: 30,
    sfOpen: 306,
    feedDay: 25,
    feedNight: 25,
    feed24h: 50,
    totalFeed: 829,
    sfClose: 181,
    feedRemarks: "-75 bags out (Dr. Ahsan)",
    birdsOpen: 18935,
    mortDay: 56,
    mortNight: 59,
    mort24h: 115,
    totalMort: 954,
    birdsClose: 18820,
    es: 85,
  },
  {
    date: "26-May-25",
    day: 31,
    sfOpen: 181,
    feedDay: 25,
    feedNight: 25,
    feed24h: 50,
    totalFeed: 879,
    sfClose: 131,
    feedRemarks: "",
    birdsOpen: 18820,
    mortDay: 97,
    mortNight: 70,
    mort24h: 167,
    totalMort: 1236,
    birdsClose: 18653,
    es: "-",
  },
  {
    date: "27-May-25",
    day: 32,
    sfOpen: 131,
    feedDay: 25,
    feedNight: 25,
    feed24h: 50,
    totalFeed: 929,
    sfClose: 23,
    feedRemarks: "-58 bags out (Kunjah Farm)",
    birdsOpen: 18653,
    mortDay: 101,
    mortNight: 90,
    mort24h: 258,
    totalMort: 1494,
    birdsClose: 18395,
    es: 67,
  },
];

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

  // Show / Hide Fast Entry Form (expanded by default for quick logging)
  const [showEntryCard, setShowEntryCard] = useState(true);

  // Shift-specific Feed
  const [feedDayBags, setFeedDayBags] = useState("4");
  const [feedNightBags, setFeedNightBags] = useState("4");
  const [openingStockBags, setOpeningStockBags] = useState("50");
  const [receivedBags, setReceivedBags] = useState("");
  const [transferredOutBags, setTransferredOutBags] = useState("");
  const [reportedClosingBags, setReportedClosingBags] = useState("");
  const [feedRemarks, setFeedRemarks] = useState("");

  // Shift-specific Mortality
  const [mortDay, setMortDay] = useState("");
  const [mortDayCause, setMortDayCause] = useState("");
  const [mortNight, setMortNight] = useState("");
  const [mortNightCause, setMortNightCause] = useState("");
  const [culls, setCulls] = useState("");

  // Paper column "E.S"
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

  // Catching calculator state (from bottom of paper register)
  const [catchingTotalKg, setCatchingTotalKg] = useState("3475");
  const [catchingAvgWeightKg, setCatchingAvgWeightKg] = useState("2.25");

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
        } catch {
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

  // Catching birds calculation
  const totalKgNum = parseFloat(catchingTotalKg) || 0;
  const avgKgNum = parseFloat(catchingAvgWeightKg) || 0;
  const calculatedBirds =
    avgKgNum > 0 ? Math.round(totalKgNum / avgKgNum) : 0;

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
      feedUsedDayShiftBags: shift === "night" ? 0 : numFeedDay,
      feedUsedNightShiftBags: shift === "day" ? 0 : numFeedNight,
      feedUsedBags: totalFeed24h,
      feedUsedKg: calculatedKg,
      openingFeedStockBags: numOpening,
      feedReceivedBags: numReceived,
      feedTransferredOutBags: numTransferOut,
      closingFeedStockBags: reportedClosingNum,
      feedRemarks: feedRemarks.trim(),
      mortalityDayShift: shift === "night" ? 0 : numMortDay,
      mortalityDayCause: mortDayCause.trim(),
      mortalityNightShift: shift === "day" ? 0 : numMortNight,
      mortalityNightCause: mortNightCause.trim(),
      mortalityCount: totalMort24h,
      culls: parseInt(culls, 10) || 0,
      customColumnES: customColumnES !== "" ? parseFloat(customColumnES) : null,
      feedType,
      waterLiters: parseFloat(waterLiters) || 0,
      minTemp: parseFloat(minTemp) || 24,
      maxTemp: parseFloat(maxTemp) || 30,
      litterCondition: litter,
      notes: notes.trim(),
    };

    try {
      await OfflineStore.enqueueMutation("DAILY_RECORD", "CREATE", payload);
      setSavedOfflineNotice(true);

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
      testID="daily-entry-scroll-view"
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={24}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.screenTitle,
                {
                  color: colors.text,
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.bold,
                },
              ]}
            >
              {currentLang === "ur"
                ? "Rozana Choozon Ka Khata"
                : "Daily Flock Record"}
            </Text>
          </View>
          <Text
            style={[
              styles.screenSubtitle,
              {
                color: colors.textSecondary,
                fontSize: typography.sizes.xs,
                marginTop: 2,
              },
            ]}
          >
            📋 16-Column Rozana Paper Register • {date}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TouchableOpacity
            onPress={toggleLanguage}
            testID="language-toggle-btn"
            style={[
              styles.langPill,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons
              name="globe-outline"
              size={14}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}
            >
              {currentLang === "ur" ? "English" : "Roman Urdu"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowEntryCard(!showEntryCard)}
            style={[
              styles.toggleEntryBtn,
              {
                backgroundColor: showEntryCard ? colors.primary : colors.card,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name={showEntryCard ? "chevron-up" : "add-circle-outline"}
              size={16}
              color={showEntryCard ? "#FFFFFF" : colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color: showEntryCard ? "#FFFFFF" : colors.primary,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {showEntryCard ? "Entry Chhupayein" : "➕ Aaj Ki Entry Likhein"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Saved Offline Banner */}
      {savedOfflineNotice && (
        <Card
          testID="saved-offline-banner"
          style={{
            backgroundColor: colors.successBg,
            borderColor: colors.success,
            marginBottom: spacing.md,
            borderWidth: 1.5,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.success}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ color: colors.success, fontWeight: "700", fontSize: 14 }}
            >
              Mehfooz Ho Gaya! (Saved Offline)
            </Text>
          </View>
          <Text
            style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}
          >
            Record local SQLite database mein safe hai aur online hote hi sync ho jaye ga.
          </Text>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* FAST DAILY ENTRY CARD (Minimal 5-second entry like handwriting in register) */}
      {/* ========================================================================= */}
      {showEntryCard && (
        <View
          style={[
            styles.paperEntryBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <View style={styles.entryHeaderRow}>
            <View>
              <Text
                style={{
                  fontSize: typography.sizes.base,
                  fontWeight: typography.weights.bold,
                  color: colors.primary,
                }}
              >
                ✏️ Aaj Ki Rozana Entry (Fast Form)
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Sirf Khuraak aur Amwaat darj karein, hisab khud ho jaye ga!
              </Text>
            </View>
            <Badge label="Active Shed" variant="primary" size="sm" />
          </View>

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
                    borderColor:
                      shift === s.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: shift === s.key ? "#fff" : colors.text,
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 1. Feed & Mortality Quick Inputs Side-by-Side */}
          <View style={styles.twoColumnGrid}>
            {/* Feed Column */}
            <View style={styles.columnBox}>
              <View style={styles.columnHeader}>
                <MaterialCommunityIcons
                  name="barley"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.primary,
                    fontSize: 13,
                  }}
                >
                  {t("daily.feedUsedBags")} (Khuraak Bags)
                </Text>
              </View>

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
                        fontSize: 11,
                        textTransform: "capitalize",
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(shift === "day" || shift === "full") && (
                <View style={{ marginVertical: 4 }}>
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
                <View style={{ marginVertical: 4 }}>
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

              <View
                style={[
                  styles.metricCallout,
                  { backgroundColor: colors.surface, marginTop: 6 },
                ]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  24h Feed:{" "}
                  <Text style={{ fontWeight: "700", color: colors.primary }}>
                    {totalFeed24h} Bags
                  </Text>{" "}
                  ({calculatedKg} kg)
                </Text>
              </View>
            </View>

            {/* Mortality Column */}
            <View style={styles.columnBox}>
              <View style={styles.columnHeader}>
                <MaterialCommunityIcons
                  name="heart-broken"
                  size={18}
                  color={colors.danger}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.danger,
                    fontSize: 13,
                  }}
                >
                  {t("daily.mortality")} (Mout / Mortality)
                </Text>
              </View>

              {(shift === "day" || shift === "full") && (
                <View style={{ marginVertical: 4 }}>
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
                    placeholder="Din Ki Wajah (Day Cause)"
                    value={mortDayCause}
                    onChangeText={setMortDayCause}
                  />
                </View>
              )}

              {(shift === "night" || shift === "full") && (
                <View style={{ marginVertical: 4 }}>
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
                    placeholder="Raat Ki Wajah (Night Cause)"
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

              <View
                style={[
                  styles.metricCallout,
                  {
                    backgroundColor: colors.dangerBg,
                    borderColor: colors.danger,
                    marginTop: 6,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.danger,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  24h Mortality Total: {totalMort24h} birds
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Stock Reconciliation & Remarks */}
          <View
            style={[
              styles.ledgerDetailsBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={{
                fontWeight: "700",
                color: colors.text,
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              📦 Stock Feed & Remarks (Register Columns)
            </Text>

            <View style={styles.stockRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Input
                  testID="feed-opening-input"
                  label="Opening Stock"
                  placeholder="0"
                  value={openingStockBags}
                  onChangeText={setOpeningStockBags}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Input
                  testID="feed-received-input"
                  label="+ Aamad (Received)"
                  placeholder="0"
                  value={receivedBags}
                  onChangeText={setReceivedBags}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  testID="feed-transfer-out-input"
                  label="- Diya (Transfer)"
                  placeholder="0"
                  value={transferredOutBags}
                  onChangeText={setTransferredOutBags}
                  keyboardType="numeric"
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
                label={`STOCK SHORTAGE DETECTED (Expected: ${expectedClosing} bags, Reported: ${reportedClosingNum} bags)`}
                variant="danger"
                style={{ marginTop: 4, marginBottom: 4 }}
              />
            )}

            <Input
              testID="feed-remarks-input"
              label="Feed In/Out Remarks"
              placeholder="e.g. +200 bags Star Feed / -50 Dr. Ahsan"
              value={feedRemarks}
              onChangeText={setFeedRemarks}
            />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Input
                  testID="custom-column-es-input"
                  label="Register Col 'E.S' (Extra / Remarks)"
                  placeholder="0"
                  value={customColumnES}
                  onChangeText={setCustomColumnES}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  testID="water-liters-input"
                  label={t("daily.waterLiters")}
                  placeholder="600"
                  value={waterLiters}
                  onChangeText={setWaterLiters}
                  keyboardType="numeric"
                  suffix={t("common.liters")}
                />
              </View>
            </View>

            {/* Hidden/minimal environment inputs to maintain full backward compatibility */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
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

            <Input
              testID="daily-notes-input"
              label={t("common.notes")}
              placeholder={t("daily.notesPlaceholder")}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Save Button */}
          <View style={{ marginTop: spacing.md }}>
            <Button
              testID="submit-daily-entry-btn"
              title={
                loading
                  ? t("common.loading")
                  : "📋 Register Mein Darj Karein (Save Entry)"
              }
              onPress={handleSubmit}
              loading={loading}
              size="lg"
            />
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 16-COLUMN DIGITAL ROZANA REGISTER (EXACT NOTEBOOK VIEW FROM PHOTOS 1 & 5) */}
      {/* ========================================================================= */}
      <View style={styles.registerSheetContainer}>
        <View style={styles.sheetHeaderBanner}>
          <View>
            <Text
              style={[
                styles.sheetTitle,
                { color: colors.text, fontSize: typography.sizes.md },
              ]}
            >
              📖 Rozana Register (16 Columns Sheet)
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              Paper notebook jesa ledger • Choozay ki rozana ki aamad o kharch
            </Text>
          </View>
          <Badge label="Days 1 - 45" variant="neutral" size="sm" />
        </View>

        {/* Horizontal Scroll Table */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={[styles.tableScrollView, { borderColor: colors.border }]}
        >
          <View style={styles.paperTable}>
            {/* Table Header 1: Column Groups */}
            <View style={[styles.tableHeaderRow, { backgroundColor: "#1E293B" }]}>
              <View style={[styles.cellStickyHeader, { width: 90 }]}>
                <Text style={styles.headerTextLight}>DATE</Text>
              </View>
              <View style={[styles.cellHeader, { width: 50 }]}>
                <Text style={styles.headerTextLight}>DAY</Text>
              </View>
              <View style={[styles.cellHeader, { width: 75 }]}>
                <Text style={styles.headerTextLight}>SF (Open)</Text>
              </View>

              {/* Feed Group */}
              <View style={[styles.cellHeaderGroup, { width: 280 }]}>
                <Text style={styles.headerTextLight}>USED FEED (BAGS)</Text>
                <View style={styles.subHeaderRow}>
                  <Text style={[styles.subHeaderText, { width: 65 }]}>DAY</Text>
                  <Text style={[styles.subHeaderText, { width: 65 }]}>NIGHT</Text>
                  <Text style={[styles.subHeaderText, { width: 75 }]}>24h Feed</Text>
                  <Text style={[styles.subHeaderText, { width: 75 }]}>Total Feed</Text>
                </View>
              </View>

              <View style={[styles.cellHeader, { width: 75 }]}>
                <Text style={styles.headerTextLight}>SF (Close)</Text>
              </View>
              <View style={[styles.cellHeader, { width: 140 }]}>
                <Text style={styles.headerTextLight}>Feed In / Out</Text>
              </View>
              <View style={[styles.cellHeader, { width: 85 }]}>
                <Text style={styles.headerTextLight}>S.Bird (Open)</Text>
              </View>

              {/* Mortality Group */}
              <View style={[styles.cellHeaderGroup, { width: 280 }]}>
                <Text style={styles.headerTextLight}>MORTALITY</Text>
                <View style={styles.subHeaderRow}>
                  <Text style={[styles.subHeaderText, { width: 65 }]}>DAY</Text>
                  <Text style={[styles.subHeaderText, { width: 65 }]}>NIGHT</Text>
                  <Text style={[styles.subHeaderText, { width: 75 }]}>24h Mort</Text>
                  <Text style={[styles.subHeaderText, { width: 75 }]}>Total Mort</Text>
                </View>
              </View>

              <View style={[styles.cellHeader, { width: 85 }]}>
                <Text style={styles.headerTextLight}>S.Bird (Close)</Text>
              </View>
              <View style={[styles.cellHeader, { width: 60 }]}>
                <Text style={styles.headerTextLight}>E.S</Text>
              </View>
            </View>

            {/* Table Rows: Ruled ledger style */}
            {SAMPLE_REGISTER_ROWS.map((row, idx) => {
              const isToday = row.day === 28;
              const rowBg = isToday
                ? "#ECFDF5"
                : idx % 2 === 0
                  ? "#FFFFFF"
                  : "#F8FAFC";

              return (
                <View
                  key={row.day}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor: rowBg,
                      borderBottomColor: "#E2E8F0",
                    },
                  ]}
                >
                  <View style={[styles.cellSticky, { width: 90 }]}>
                    <Text
                      style={[
                        styles.cellTextBold,
                        { color: isToday ? "#059669" : "#0F172A" },
                      ]}
                    >
                      {row.date}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 50 }]}>
                    <Text style={styles.cellTextBold}>{row.day}</Text>
                  </View>
                  <View style={[styles.cell, { width: 75 }]}>
                    <Text style={styles.cellText}>{row.sfOpen}</Text>
                  </View>

                  {/* Feed columns */}
                  <View style={[styles.cell, { width: 65 }]}>
                    <Text style={styles.cellText}>{row.feedDay}</Text>
                  </View>
                  <View style={[styles.cell, { width: 65 }]}>
                    <Text style={styles.cellText}>{row.feedNight}</Text>
                  </View>
                  <View
                    style={[
                      styles.cell,
                      { width: 75, backgroundColor: isToday ? "#D1FAE5" : "#F1F5F9" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellTextBold,
                        { color: "#0F766E" },
                      ]}
                    >
                      {row.feed24h}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 75 }]}>
                    <Text style={styles.cellTextBold}>{row.totalFeed}</Text>
                  </View>

                  <View style={[styles.cell, { width: 75 }]}>
                    <Text style={styles.cellText}>{row.sfClose}</Text>
                  </View>
                  <View style={[styles.cell, { width: 140 }]}>
                    <Text
                      numberOfLines={1}
                      style={[styles.cellTextItalic, { color: "#2563EB" }]}
                    >
                      {row.feedRemarks || "-"}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 85 }]}>
                    <Text style={styles.cellText}>{row.birdsOpen}</Text>
                  </View>

                  {/* Mortality columns */}
                  <View style={[styles.cell, { width: 65 }]}>
                    <Text style={[styles.cellText, { color: "#DC2626" }]}>
                      {row.mortDay}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 65 }]}>
                    <Text style={[styles.cellText, { color: "#DC2626" }]}>
                      {row.mortNight}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.cell,
                      { width: 75, backgroundColor: "#FEE2E2" },
                    ]}
                  >
                    <Text style={[styles.cellTextBold, { color: "#B91C1C" }]}>
                      {row.mort24h}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: 75 }]}>
                    <Text style={[styles.cellTextBold, { color: "#991B1B" }]}>
                      {row.totalMort}
                    </Text>
                  </View>

                  <View style={[styles.cell, { width: 85 }]}>
                    <Text style={styles.cellTextBold}>{row.birdsClose}</Text>
                  </View>
                  <View style={[styles.cell, { width: 60 }]}>
                    <Text style={styles.cellText}>{row.es}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* ========================================================================= */}
        {/* BOTTOM CATCHING / LIFTING CALCULATOR (MATCHING PHOTOS 1 & 5 NOTEBOOK NOTE) */}
        {/* ========================================================================= */}
        <View
          style={[
            styles.catchingCard,
            { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="truck-fast"
              size={20}
              color="#B45309"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontWeight: "700",
                color: "#92400E",
                fontSize: 14,
              }}
            >
              ⚖️ CATCHING / LIFTING HISAB (Gari Ka Hisab)
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: "#78350F", marginTop: 2 }}>
            Register ke aakhir mein formula: Total Weight ÷ Average Weight = Chooza
          </Text>

          <View style={styles.catchingInputsRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#92400E" }}>
                Kul Wazan (Total kg):
              </Text>
              <Input
                placeholder="3475"
                value={catchingTotalKg}
                onChangeText={setCatchingTotalKg}
                keyboardType="numeric"
                suffix="kg"
              />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#92400E" }}>
                Avg Wazan (kg):
              </Text>
              <Input
                placeholder="2.25"
                value={catchingAvgWeightKg}
                onChangeText={setCatchingAvgWeightKg}
                keyboardType="numeric"
                suffix="kg"
              />
            </View>
            <View
              style={[
                styles.catchingResultBox,
                { backgroundColor: "#FDE68A", borderColor: "#D97706" },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#78350F" }}>
                Total Chooza:
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#92400E",
                }}
              >
                {calculatedBirds}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: "#92400E", fontStyle: "italic" }}>
            Misaal: {totalKgNum} kg ÷ {avgKgNum} kg = {calculatedBirds} Chooza
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  screenTitle: {},
  screenSubtitle: {},
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleEntryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  paperEntryBox: {
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shiftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shiftTab: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  twoColumnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  columnBox: {
    flex: 1,
    minWidth: 260,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FAFAFA",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },
  quickCounterRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  stepperButton: {
    flex: 1,
    paddingVertical: 4,
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    marginHorizontal: 2,
    backgroundColor: "#F3F4F6",
  },
  stepperText: {
    fontWeight: "700",
    fontSize: 12,
    color: "#1F2937",
  },
  bigNumericInput: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectorRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  typeChip: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
  },
  metricCallout: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  ledgerDetailsBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  stockRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  registerSheetContainer: {
    marginTop: 8,
  },
  sheetHeaderBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    fontWeight: "800",
  },
  tableScrollView: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  paperTable: {
    flexDirection: "column",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cellHeader: {
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  cellStickyHeader: {
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  cellHeaderGroup: {
    borderRightWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    paddingTop: 4,
  },
  subHeaderRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    marginTop: 4,
  },
  subHeaderText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: "#334155",
  },
  headerTextLight: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  cellSticky: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  cellText: {
    fontSize: 11,
    color: "#334155",
    textAlign: "center",
  },
  cellTextBold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  cellTextItalic: {
    fontSize: 10,
    fontStyle: "italic",
    textAlign: "center",
  },
  catchingCard: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  catchingInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  catchingResultBox: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
});
