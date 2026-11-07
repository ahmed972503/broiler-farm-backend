import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../../src/theme";
import {
  Card,
  Badge,
  Button,
  Input,
  StatCard,
} from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";
import { Ionicons } from "@expo/vector-icons";

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Close batch modal state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeDate, setCloseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [finalMortalityAdj, setFinalMortalityAdj] = useState("0");
  const [finalCullsAdj, setFinalCullsAdj] = useState("0");
  const [closeNotes, setCloseNotes] = useState("Flock lifted and completed");
  const [closing, setClosing] = useState(false);

  const loadBatch = async () => {
    try {
      const res = await apiFetch(`/api/batches/${id}`);
      if (res.success && res.data) {
        setBatch(res.data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBatch();
  }, [id]);

  const handleCloseBatch = async () => {
    setClosing(true);
    try {
      const res = await apiFetch(`/api/batches/${id}/close`, {
        method: "POST",
        body: JSON.stringify({
          closedAt: closeDate,
          finalMortalityAdjustment: parseInt(finalMortalityAdj, 10) || 0,
          finalCullsAdjustment: parseInt(finalCullsAdj, 10) || 0,
          notes: closeNotes,
        }),
      });

      if (res.success && res.data) {
        Alert.alert(
          "Batch Closed!",
          "Final FCR, production costs, and net profit calculated.",
        );
        setBatch(res.data);
        setShowCloseModal(false);
      } else {
        Alert.alert("Error", res.error || "Failed to close batch");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setClosing(false);
    }
  };

  const summary = batch?.closeSummary;

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadBatch();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            {batch?.batchNumber || "Flock Details"}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            {batch?.shedId?.name || "Shed"} • Placed:{" "}
            {batch?.chicksPlaced?.toLocaleString()} ({batch?.breed})
          </Text>
        </View>

        <Badge
          label={batch?.status?.toUpperCase() || "ACTIVE"}
          variant={batch?.status === "active" ? "success" : "neutral"}
        />
      </View>

      {/* If Closed, display Final Performance Summary */}
      {summary ? (
        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="ribbon-outline"
              size={22}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.sizes.lg,
                fontWeight: typography.weights.bold,
              }}
            >
              Harvest Performance Summary
            </Text>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol2}>
              <StatCard
                title="Feed Conversion (FCR)"
                value={summary.fcr}
                subtitle={`${summary.totalFeedConsumedKg?.toLocaleString()} kg consumed`}
                badgeLabel="FCR"
                badgeVariant="success"
              />
            </View>
            <View style={styles.gridCol2}>
              <StatCard
                title="Net Profit"
                value={`Rs. ${(summary.netProfit || 0).toLocaleString()}`}
                subtitle={`Revenue Rs. ${(summary.totalSalesRevenue || 0).toLocaleString()}`}
                badgeLabel="Profit"
                badgeVariant={summary.netProfit >= 0 ? "success" : "danger"}
              />
            </View>
          </View>

          <View style={[styles.gridRow, { marginTop: 8 }]}>
            <View style={styles.gridCol3}>
              <StatCard
                title="Production Cost / kg"
                value={`Rs. ${summary.costPerKgSold}`}
                subtitle="Cost per kg live"
              />
            </View>
            <View style={styles.gridCol3}>
              <StatCard
                title="EPEF Index"
                value={summary.epef}
                subtitle="European efficiency"
                badgeLabel="EPEF"
                badgeVariant="info"
              />
            </View>
            <View style={styles.gridCol3}>
              <StatCard
                title="Livability %"
                value={`${summary.livabilityPercent}%`}
                subtitle={`${summary.totalBirdsSold} birds sold`}
              />
            </View>
          </View>

          <Card elevated style={{ marginTop: spacing.md }}>
            <Text
              style={{
                color: colors.text,
                fontWeight: "700",
                fontSize: 15,
                marginBottom: 8,
              }}
            >
              Financial Breakdown
            </Text>
            <View style={styles.breakdownRow}>
              <Text style={{ color: colors.textSecondary }}>
                Chick Purchase Cost:
              </Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                Rs. {summary.totalChickCost?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={{ color: colors.textSecondary }}>Feed Cost:</Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                Rs. {summary.totalFeedCost?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={{ color: colors.textSecondary }}>
                Medicines & Vaccines:
              </Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                Rs. {summary.totalMedicineCost?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={{ color: colors.textSecondary }}>
                Other Expenses:
              </Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                Rs. {summary.totalOtherExpenses?.toLocaleString()}
              </Text>
            </View>
            <View
              style={[
                styles.breakdownRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: 6,
                  marginTop: 4,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Total Batch Cost:
              </Text>
              <Text style={{ color: colors.danger, fontWeight: "700" }}>
                Rs. {summary.totalBatchCost?.toLocaleString()}
              </Text>
            </View>
          </Card>
        </View>
      ) : null}

      {/* Active Flock Actions */}
      {batch?.status === "active" ? (
        <Card elevated>
          <Text
            style={{
              color: colors.text,
              fontWeight: "700",
              fontSize: 16,
              marginBottom: 4,
            }}
          >
            Flock Lifecycle Actions
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            Harvest flock, compute final FCR, cost per kg, and net profit.
          </Text>

          {!showCloseModal ? (
            <Button
              title="Harvest & Close Flock (Batch Khatam Karein)"
              variant="danger"
              size="lg"
              onPress={() => setShowCloseModal(true)}
            />
          ) : (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 14,
              }}
            >
              <Text
                style={{
                  color: colors.danger,
                  fontWeight: "700",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Confirm Batch Closure & Harvest
              </Text>
              <Input
                label="Harvest / Close Date"
                value={closeDate}
                onChangeText={setCloseDate}
              />
              <Input
                label="Final Mortality Adjustment (Birds)"
                value={finalMortalityAdj}
                onChangeText={setFinalMortalityAdj}
                keyboardType="numeric"
              />
              <Input
                label="Final Culls Adjustment (Birds)"
                value={finalCullsAdj}
                onChangeText={setFinalCullsAdj}
                keyboardType="numeric"
              />
              <Input
                label="Harvest Notes"
                value={closeNotes}
                onChangeText={setCloseNotes}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowCloseModal(false)}
                  style={{ flex: 0.48 }}
                />
                <Button
                  title="Confirm Close"
                  variant="danger"
                  loading={closing}
                  onPress={handleCloseBatch}
                  style={{ flex: 0.48 }}
                />
              </View>
            </View>
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  gridCol2: {
    width: "50%",
    padding: 4,
  },
  gridCol3: {
    width: "33.333%",
    padding: 4,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
});
