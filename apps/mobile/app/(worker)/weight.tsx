import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Button, Card, Badge, Input, StatCard } from "../../src/components/ui";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { compareWithTargetWeight } from "@broiler/shared";
import { useTranslation } from "react-i18next";

// Real historical weekly cards directly from farm notebook (Photo 3)
const SAMPLE_WEEKLY_DATA = [
  {
    weekTitle: "1st Week",
    day: 7,
    totalChicks: 19888,
    remainingChicks: 19744,
    weeklyFeedBags: 63,
    totalFeedBags: 63,
    weeklyMort: 144,
    totalMort: 144,
    avgWeightGrams: 200,
    totalWeightKg: 3948.8,
    fcrFarmMethod: "62.67",
    trueFcr: "0.80",
  },
  {
    weekTitle: "2nd Week",
    day: 14,
    totalChicks: 19888,
    remainingChicks: 19666,
    weeklyFeedBags: 147,
    totalFeedBags: 210,
    weeklyMort: 79,
    totalMort: 223,
    avgWeightGrams: 493,
    totalWeightKg: 9695.3,
    fcrFarmMethod: "46.16",
    trueFcr: "1.08",
  },
  {
    weekTitle: "3rd Week",
    day: 21,
    totalChicks: 19888,
    remainingChicks: 19582,
    weeklyFeedBags: 226,
    totalFeedBags: 436,
    weeklyMort: 84,
    totalMort: 307,
    avgWeightGrams: 883,
    totalWeightKg: 17290.9,
    fcrFarmMethod: "39.65",
    trueFcr: "1.26",
  },
  {
    weekTitle: "4th Week",
    day: 28,
    totalChicks: 19888,
    remainingChicks: 19135,
    weeklyFeedBags: 293,
    totalFeedBags: 729,
    weeklyMort: 447,
    totalMort: 754,
    avgWeightGrams: 1404,
    totalWeightKg: 26865.5,
    fcrFarmMethod: "36.85",
    trueFcr: "1.36",
  },
  {
    weekTitle: "5th Week",
    day: 35,
    totalChicks: 19888,
    remainingChicks: 17995,
    weeklyFeedBags: 328,
    totalFeedBags: 1057,
    weeklyMort: 1140,
    totalMort: 1894,
    avgWeightGrams: 2025,
    totalWeightKg: 36349.8,
    fcrFarmMethod: "34.47",
    trueFcr: "1.45",
  },
  {
    weekTitle: "6th Week",
    day: 42,
    totalChicks: 19888,
    remainingChicks: 16114,
    weeklyFeedBags: 350,
    totalFeedBags: 1407,
    weeklyMort: 450,
    totalMort: 2344,
    avgWeightGrams: 2450,
    totalWeightKg: 39479.3,
    fcrFarmMethod: "28.05",
    trueFcr: "1.78",
  },
];

export default function WorkerWeightScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();
  const { t } = useTranslation();

  const [weights, setWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form toggle & fields
  const [showSampleForm, setShowSampleForm] = useState(false);
  const [ageInDays, setAgeInDays] = useState("28");
  const [sampleSize, setSampleSize] = useState("50");
  const [avgWeightGrams, setAvgWeightGrams] = useState("1404");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shedId = user?.assignedShedId || user?.shed?.id;

  const loadWeights = async () => {
    try {
      if (shedId) {
        const res = await apiFetch(`/api/weights?shedId=${shedId}`);
        if (res.success && res.data) {
          setWeights(res.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch weights", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeights();
  }, [shedId]);

  const currentAge = parseInt(ageInDays, 10) || 0;
  const currentAvgWeight = parseFloat(avgWeightGrams) || 0;
  const comparison = compareWithTargetWeight(currentAge, currentAvgWeight);

  const handleSaveWeight = async () => {
    if (!currentAvgWeight || currentAvgWeight <= 0) {
      Alert.alert("Required", "Please enter a valid average weight in grams.");
      return;
    }

    setSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const payload = {
        batchId: user?.shed?.currentBatchId || "batch-active",
        shedId,
        date: todayStr,
        ageInDays: currentAge,
        sampleSize: parseInt(sampleSize, 10) || 50,
        averageWeightGrams: currentAvgWeight,
        notes: notes.trim(),
      };

      await OfflineStore.enqueueMutation("WEIGHT_RECORD", "CREATE", payload);

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn(e),
        );
      }

      Alert.alert(
        "Mehfooz Ho Gaya!",
        `Day ${currentAge} sample weight (${currentAvgWeight}g) saved.`,
      );
      loadWeights();
      setShowSampleForm(false);
      setNotes("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save weight");
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
            loadWeights();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
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
              Haftawar Summary (Weekly Flock Detail)
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.xs,
              marginTop: 2,
            }}
          >
            Notebook Khata (Photo 3) • Week 1 se Week 6 ka Mukammal Hisab
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowSampleForm(!showSampleForm)}
          style={[
            styles.toggleFormBtn,
            {
              backgroundColor: showSampleForm ? colors.surface : colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name={showSampleForm ? "close" : "scale-outline"}
            size={16}
            color={showSampleForm ? colors.primary : "#FFFFFF"}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              color: showSampleForm ? colors.primary : "#FFFFFF",
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            {showSampleForm ? "Band Karein" : "Wazan Likhein"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sample Weight Entry Form (Expandable) */}
      {showSampleForm && (
        <Card elevated style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons
              name="scale-balance"
              size={18}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: typography.sizes.base,
                fontWeight: typography.weights.bold,
                color: colors.primary,
              }}
            >
              Choozay Ka Sample Wazan Darj Karein
            </Text>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Input
                label="Choozay Ki Umar (Days)"
                placeholder="28"
                value={ageInDays}
                onChangeText={setAgeInDays}
                keyboardType="number-pad"
                suffix="Days"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Sample Size (Tadaad)"
                placeholder="50"
                value={sampleSize}
                onChangeText={setSampleSize}
                keyboardType="number-pad"
                suffix="Birds"
              />
            </View>
          </View>

          <Input
            label="Average Weight (Aousat Wazan)"
            placeholder="1404"
            value={avgWeightGrams}
            onChangeText={setAvgWeightGrams}
            keyboardType="numeric"
            suffix="grams"
          />

          {/* Cobb 500 Benchmark Comparison Badge */}
          {comparison && (
            <View
              style={[
                styles.comparisonBox,
                {
                  backgroundColor:
                    comparison.status === "ABOVE"
                      ? "#ECFDF5"
                      : comparison.status === "BELOW"
                        ? "#FEF2F2"
                        : "#EFF6FF",
                  borderColor:
                    comparison.status === "ABOVE"
                      ? "#10B981"
                      : comparison.status === "BELOW"
                        ? "#EF4444"
                        : "#3B82F6",
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 12,
                  color:
                    comparison.status === "ABOVE"
                      ? "#047857"
                      : comparison.status === "BELOW"
                        ? "#B91C1C"
                        : "#1D4ED8",
                }}
              >
                Cobb 500 Standard (Day {currentAge}): {comparison.targetGrams}g •{" "}
                {comparison.status === "ABOVE"
                  ? `+${comparison.differenceGrams}g Aage (Above Target)`
                  : comparison.status === "BELOW"
                    ? `${comparison.differenceGrams}g Peeche (Below Target)`
                    : "Target Ke Barabar"}
              </Text>
            </View>
          )}

          <Input
            label="Notes"
            placeholder="Wazan ke mutaliq koi note"
            value={notes}
            onChangeText={setNotes}
          />

          <View style={{ marginTop: 8 }}>
            <Button
              title={
                submitting
                  ? "Mehfooz Ho Raha Hai..."
                  : "Sample Wazan Mehfooz Karein"
              }
              onPress={handleSaveWeight}
              loading={submitting}
              size="md"
            />
          </View>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6 WEEKLY FLOCK DETAIL CARDS (EXACT NOTEBOOK FORMAT FROM PHOTO 3) */}
      {/* ========================================================================= */}
      <View style={styles.weeklyGrid}>
        {SAMPLE_WEEKLY_DATA.map((week) => (
          <View
            key={week.weekTitle}
            style={[
              styles.weekCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            {/* Card Header (Week Title & Day) */}
            <View
              style={[
                styles.weekHeaderBanner,
                {
                  backgroundColor:
                    week.day === 28 ? "#059669" : "#1E293B",
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={14}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.weekHeaderText}>
                  {week.weekTitle} (Day {week.day})
                </Text>
              </View>
              {week.day === 28 && (
                <Badge label="Current Week" variant="success" size="sm" />
              )}
            </View>

            {/* Metrics List (Ruled Notebook Lines) */}
            <View style={styles.metricsList}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Chicks:</Text>
                <Text style={styles.metricValBold}>
                  {week.totalChicks.toLocaleString()}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Remaining Chicks:</Text>
                <Text
                  style={[
                    styles.metricValBold,
                    { color: "#059669" },
                  ]}
                >
                  {week.remainingChicks.toLocaleString()}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Weekly Feed:</Text>
                <Text style={styles.metricVal}>
                  {week.weeklyFeedBags} bags
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Feed:</Text>
                <Text style={styles.metricValBold}>
                  {week.totalFeedBags} bags
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Weekly Mortality:</Text>
                <Text style={[styles.metricVal, { color: "#DC2626" }]}>
                  {week.weeklyMort} birds
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Mortality:</Text>
                <Text style={[styles.metricValBold, { color: "#B91C1C" }]}>
                  {week.totalMort} birds
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Average Weight:</Text>
                <Text
                  style={[
                    styles.metricValBold,
                    { color: "#2563EB" },
                  ]}
                >
                  {week.avgWeightGrams} grams
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Weight (Live):</Text>
                <Text style={styles.metricValBold}>
                  {week.totalWeightKg.toLocaleString()} kg
                </Text>
              </View>

              {/* FCR Section: Both Farm Method & True FCR */}
              <View
                style={[
                  styles.fcrRowBox,
                  { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400E" }}>
                    F.C.R (Farm Method):
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#78350F",
                    }}
                  >
                    {week.fcrFarmMethod}
                  </Text>
                  <Text style={{ fontSize: 9, color: "#B45309" }}>
                    Total kg ÷ Bags
                  </Text>
                </View>

                <View style={{ borderLeftWidth: 1, borderColor: "#D97706", paddingLeft: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400E" }}>
                    True FCR:
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#059669",
                    }}
                  >
                    {week.trueFcr}
                  </Text>
                  <Text style={{ fontSize: 9, color: "#047857" }}>
                    Feed kg ÷ Live kg
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
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
  toggleFormBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  comparisonBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
  weeklyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  weekCard: {
    flex: 1,
    minWidth: 260,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  weekHeaderBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekHeaderText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  metricsList: {
    padding: 10,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  metricVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "600",
  },
  metricValBold: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "800",
  },
  fcrRowBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    alignItems: "center",
  },
});
