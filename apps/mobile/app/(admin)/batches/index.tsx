import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../../src/theme";
import { Card, Badge, Button } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function BatchesListScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();

  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");

  const loadBatches = async () => {
    try {
      const res = await apiFetch("/api/batches");
      if (res.success && res.data) {
        setBatches(res.data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const filtered = batches.filter((b) => {
    if (filter === "active") return b.status === "active";
    if (filter === "closed") return b.status === "closed";
    return true;
  });

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          padding: spacing.base,
          maxWidth: 1000,
          alignSelf: "center",
          width: "100%",
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadBatches();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            Flocks & Batches
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            Flock lifecycle from chick placement to harvesting
          </Text>
        </View>

        <Button
          title="+ Place New Flock"
          size="sm"
          onPress={() => router.push("/(admin)/batches/create" as any)}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginBottom: 12 }}
      >
        {(["all", "active", "closed"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={[
              styles.filterTab,
              {
                backgroundColor:
                  filter === tab ? colors.primary : colors.surface,
                borderColor: filter === tab ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: filter === tab ? colors.white : colors.text,
                fontSize: typography.sizes.xs,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Batches List */}
      {filtered.map((b) => (
        <Card key={b._id} elevated style={{ marginVertical: 6 }}>
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
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.bold,
                }}
              >
                {b.batchNumber}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.sizes.xs,
                }}
              >
                {b.shedId?.name || "Shed"} • Placed:{" "}
                {b.chicksPlaced?.toLocaleString()} ({b.breed})
              </Text>
            </View>

            <Badge
              label={b.status.toUpperCase()}
              variant={b.status === "active" ? "success" : "neutral"}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Placement: {b.placementDate}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Chick Rate: Rs. {b.chickRate}
            </Text>
          </View>

          {b.closeSummary ? (
            <View
              style={[
                styles.summaryBox,
                {
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  padding: 8,
                  marginTop: 8,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.success,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Harvested: FCR {b.closeSummary.fcr} • Profit: Rs.{" "}
                {(b.closeSummary.netProfit || 0).toLocaleString()}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Livability: {b.closeSummary.livabilityPercent}% • EPEF:{" "}
                {b.closeSummary.epef} • Birds Sold:{" "}
                {b.closeSummary.totalBirdsSold}
              </Text>
            </View>
          ) : null}

          <Button
            title="View Details & Manage"
            variant="outline"
            size="sm"
            onPress={() => router.push(`/(admin)/batches/${b._id}` as any)}
            style={{ marginTop: 10 }}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  filterTab: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  summaryBox: {},
});
