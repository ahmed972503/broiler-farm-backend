import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Button, Card, Badge, StatCard } from "../../src/components/ui";
import { apiFetch } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useTranslation } from "react-i18next";

export default function WorkerTodayScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [shedDetails, setShedDetails] = useState<any>(null);
  const [pendingVaccines, setPendingVaccines] = useState<any[]>([]);

  const loadData = async () => {
    try {
      // 1. Fetch Shed & Active Batch details
      const shedId = user?.assignedShedId || user?.shed?.id;
      if (shedId) {
        const shedRes = await apiFetch(`/api/sheds/${shedId}`);
        if (shedRes.success && shedRes.data) {
          setShedDetails(shedRes.data);
        }

        // 2. Fetch today's daily record
        const recordRes = await apiFetch(`/api/daily-records/today/${shedId}`);
        if (recordRes.success && recordRes.data) {
          setTodayRecord(recordRes.data);
        } else {
          // Check local offline cache
          const localRecords = await OfflineStore.getLocalCache("DAILY_RECORD");
          const todayStr = new Date().toISOString().split("T")[0];
          const localToday = localRecords.find((r: any) => r.date === todayStr);
          setTodayRecord(localToday || null);
        }

        // 3. Fetch vaccination tasks
        const vacRes = await apiFetch(
          `/api/vaccinations/tasks?shedId=${shedId}&status=pending`,
        );
        if (vacRes.success && vacRes.data) {
          setPendingVaccines(vacRes.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch worker today data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const activeBatch = shedDetails?.activeBatch;
  const placementDate = activeBatch
    ? new Date(activeBatch.placementDate)
    : null;
  const today = new Date();
  const ageInDays = placementDate
    ? Math.max(
        1,
        Math.ceil(
          (today.getTime() - placementDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      {/* Entry Status Card */}
      {todayRecord ? (
        <Card
          style={[
            styles.statusCard,
            { backgroundColor: colors.successBg, borderColor: colors.success },
          ]}
        >
          <View style={styles.statusRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={26}
              color={colors.success}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.statusTitle,
                  {
                    color: colors.success,
                    fontSize: typography.sizes.base,
                    fontWeight: typography.weights.bold,
                  },
                ]}
              >
                {t("worker.entryCompleted")}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sizes.xs,
                }}
              >
                Mortality: {todayRecord.mortalityCount} birds • Feed:{" "}
                {todayRecord.feedUsedBags} bags ({todayRecord.feedType})
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card
          style={[
            styles.statusCard,
            { backgroundColor: colors.warningBg, borderColor: colors.warning },
          ]}
        >
          <View style={styles.statusRow}>
            <Ionicons
              name="alert-circle-outline"
              size={26}
              color={colors.warning}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.statusTitle,
                  {
                    color: colors.warning,
                    fontSize: typography.sizes.base,
                    fontWeight: typography.weights.bold,
                  },
                ]}
              >
                {t("worker.missingEntry")}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sizes.xs,
                }}
              >
                Please submit today's mortality, feed, and temperature reading.
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Main Big Button: Add / Edit Daily Entry */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push("/(worker)/daily-entry")}
        style={[
          styles.bigEntryButton,
          {
            backgroundColor: todayRecord ? colors.secondary : colors.primary,
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        <Ionicons
          name="create-outline"
          size={32}
          color="#FFFFFF"
          style={{ marginBottom: 4 }}
        />
        <Text
          style={[
            styles.bigButtonTitle,
            {
              fontSize: typography.sizes.lg,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          {todayRecord ? "Edit Today's Entry" : t("worker.addDailyEntry")}
        </Text>
        <Text style={styles.bigButtonSubtitle}>
          {t("worker.quickEntrySubtitle")}
        </Text>
      </TouchableOpacity>

      {/* Shed & Flock Overview */}
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.text,
            fontSize: typography.sizes.md,
            fontWeight: typography.weights.bold,
            marginTop: spacing.lg,
          },
        ]}
      >
        {shedDetails?.name || "Assigned Shed"} • Flock Status
      </Text>

      <View style={styles.statsGrid}>
        <StatCard
          title={t("dashboard.age")}
          value={`${ageInDays} ${t("common.days")}`}
          subtitle={`Placed: ${activeBatch?.chicksPlaced || 5000}`}
          style={styles.gridCard}
        />
        <StatCard
          title="Flock Number"
          value={activeBatch?.batchNumber || "FLOCK-ACTIVE"}
          subtitle={activeBatch?.breed || "Cobb 500"}
          style={styles.gridCard}
        />
      </View>

      {/* Urgent Vaccine Tasks Banner */}
      {pendingVaccines.length > 0 ? (
        <Card
          style={{ borderColor: colors.danger, marginTop: spacing.md }}
          elevated
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing.xs,
            }}
          >
            <MaterialCommunityIcons
              name="needle"
              size={20}
              color={colors.danger}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: colors.danger,
                fontSize: typography.sizes.base,
                fontWeight: typography.weights.bold,
              }}
            >
              {t("worker.vaccineTasks")} ({pendingVaccines.length})
            </Text>
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.semibold,
            }}
          >
            {pendingVaccines[0]?.vaccineName} ({pendingVaccines[0]?.route})
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sizes.xs,
              marginBottom: spacing.sm,
            }}
          >
            Due Date: {pendingVaccines[0]?.dueDate}
          </Text>
          <Button
            title="Mark Completed (Teeka Lag Gaya)"
            size="sm"
            onPress={() => router.push("/(worker)/vaccinations")}
          />
        </Card>
      ) : null}

      {/* Quick Links */}
      <View style={styles.quickLinksRow}>
        <TouchableOpacity
          onPress={() => router.push("/(worker)/weight")}
          style={[
            styles.quickCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="scale"
            size={24}
            color={colors.primary}
            style={{ marginBottom: 4 }}
          />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.bold,
            }}
          >
            {t("worker.sampleWeight")}
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}
          >
            Sample weighing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(worker)/history")}
          style={[
            styles.quickCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Ionicons
            name="reader-outline"
            size={24}
            color={colors.primary}
            style={{ marginBottom: 4 }}
          />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.sm,
              fontWeight: typography.weights.bold,
            }}
          >
            Past Records
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}
          >
            30 days log
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 80,
  },
  statusCard: {
    padding: 12,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusTitle: {
    marginBottom: 2,
  },
  bigEntryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 110,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bigButtonIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  bigButtonTitle: {
    color: "#FFFFFF",
  },
  bigButtonSubtitle: {
    color: "#E2E8F0",
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridCard: {
    flex: 0.485,
  },
  quickLinksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  quickCard: {
    flex: 0.485,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
  },
});
