import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert as NativeAlert,
} from "react-native";
import { useTheme } from "../../../src/theme";
import { Card, Badge, Button } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";
import { Ionicons } from "@expo/vector-icons";

export default function AlertsCenterScreen() {
  const { colors, typography, spacing } = useTheme();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const loadAlerts = async () => {
    try {
      const res = await apiFetch("/api/alerts");
      if (res.success && res.data) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleSweep = async () => {
    setSweeping(true);
    try {
      const res = await apiFetch("/api/alerts/sweep", { method: "POST" });
      if (res.success) {
        const count = (res as any).count || res.data?.length || 0;
        NativeAlert.alert(
          "Audit Complete",
          `Alert audit sweep evaluated farm data. ${count} active alerts.`,
        );
        loadAlerts();
      }
    } catch (err: any) {
      NativeAlert.alert("Error", err.message);
    } finally {
      setSweeping(false);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const res = await apiFetch(`/api/alerts/${alertId}/resolve`, {
        method: "POST",
      });
      if (res.success) {
        loadAlerts();
      }
    } catch (err: any) {
      NativeAlert.alert("Error", err.message);
    }
  };

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
            loadAlerts();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            Alerts Engine (Khabardari Center)
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            Automated alerts for mortality spikes, missed entries, overdue
            vaccines, and low stock
          </Text>
        </View>

        <Button
          title={sweeping ? "Auditing..." : "Run Audit Sweep"}
          variant="secondary"
          size="sm"
          onPress={handleSweep}
          loading={sweeping}
        />
      </View>

      {alerts.length === 0 ? (
        <Card style={{ padding: 24, alignItems: "center", marginTop: 12 }}>
          <Ionicons
            name="checkmark-circle-outline"
            size={36}
            color={colors.success}
            style={{ marginBottom: 8 }}
          />
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
            All Farm Systems Normal
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 13,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            No critical mortality spikes, overdue vaccines, or feed shortages
            detected.
          </Text>
        </Card>
      ) : (
        alerts.map((al) => (
          <Card
            key={al._id}
            elevated
            style={{
              borderColor:
                al.severity === "critical" ? colors.danger : colors.warning,
              marginVertical: 6,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <View style={{ flex: 1, minWidth: 200, paddingRight: 8 }}>
                <Text
                  style={{
                    color:
                      al.severity === "critical"
                        ? colors.danger
                        : colors.warning,
                    fontWeight: "700",
                    fontSize: 15,
                  }}
                >
                  {al.title}
                </Text>
                <Text
                  style={{ color: colors.text, fontSize: 13, marginTop: 4 }}
                >
                  {al.message}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {new Date(al.createdAt).toLocaleString()}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 6 }}>
                <Badge
                  label={al.isResolved ? "RESOLVED" : al.severity.toUpperCase()}
                  variant={
                    al.isResolved
                      ? "success"
                      : al.severity === "critical"
                        ? "danger"
                        : "warning"
                  }
                />
                {!al.isResolved ? (
                  <Button
                    title="Mark Resolved"
                    variant="outline"
                    size="sm"
                    onPress={() => handleResolve(al._id)}
                    style={{ marginTop: 6 }}
                  />
                ) : null}
              </View>
            </View>
          </Card>
        ))
      )}
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
});
