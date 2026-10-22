import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../../src/theme";
import { Card, Badge, Button, Input } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function AdminDailyRecordsScreen() {
  const { colors, typography, spacing } = useTheme();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState("Admin approved correction");

  const loadRecords = async () => {
    try {
      const res = await apiFetch("/api/daily-records");
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleUnlock = async (recordId: string) => {
    try {
      const res = await apiFetch(`/api/daily-records/${recordId}/unlock`, {
        method: "POST",
        body: JSON.stringify({ reason: unlockReason }),
      });
      if (res.success) {
        Alert.alert(
          "Unlocked!",
          "Daily record has been unlocked for worker editing.",
        );
        setUnlockingId(null);
        loadRecords();
      } else {
        Alert.alert("Error", res.error || "Failed to unlock record");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadRecords();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.xl,
            fontWeight: typography.weights.heavy,
          }}
        >
          All Daily Records (Rozana Khata)
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}
        >
          Review daily entries from all sheds, inspect anomalies, and unlock
          records for editing
        </Text>
      </View>

      {records.map((record) => (
        <Card key={record._id} elevated style={{ marginVertical: 6 }}>
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
                {record.date} • Day {record.ageInDays}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.sizes.xs,
                }}
              >
                Logged by {record.createdBy?.name || "Worker"}
              </Text>
            </View>

            <Badge
              label={record.isLocked ? "🔒 LOCKED" : "✏️ OPEN"}
              variant={record.isLocked ? "neutral" : "success"}
            />
          </View>

          <View
            style={[
              styles.metricsGrid,
              {
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 8,
                marginVertical: 8,
              },
            ]}
          >
            <View style={styles.metricCell}>
              <Text
                style={{
                  color: colors.danger,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {record.mortalityCount}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Mortality
              </Text>
            </View>
            <View style={styles.metricCell}>
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {record.feedUsedBags} bags
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                {record.feedType} ({record.feedUsedKg} kg)
              </Text>
            </View>
            <View style={styles.metricCell}>
              <Text
                style={{
                  color: colors.secondary,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {record.waterLiters} L
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Water
              </Text>
            </View>
            <View style={styles.metricCell}>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}
              >
                {record.minTemp}°-{record.maxTemp}°C
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Temp
              </Text>
            </View>
          </View>

          {record.notes ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                marginBottom: 8,
                fontStyle: "italic",
              }}
            >
              Note: {record.notes}
            </Text>
          ) : null}

          {record.isLocked ? (
            unlockingId === record._id ? (
              <View style={{ marginTop: 8 }}>
                <Input
                  label="Reason for Unlocking"
                  value={unlockReason}
                  onChangeText={setUnlockReason}
                />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}
                >
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="sm"
                    onPress={() => setUnlockingId(null)}
                    style={{ flex: 0.48 }}
                  />
                  <Button
                    title="Confirm Unlock"
                    size="sm"
                    onPress={() => handleUnlock(record._id)}
                    style={{ flex: 0.48 }}
                  />
                </View>
              </View>
            ) : (
              <Button
                title="Unlock Record for Worker"
                variant="outline"
                size="sm"
                onPress={() => setUnlockingId(record._id)}
                style={{ marginTop: 6 }}
              />
            )
          ) : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricCell: {
    alignItems: "center",
    flex: 1,
  },
});
