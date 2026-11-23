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
      const shedId = user?.assignedShedId || user?.shed?.id;
      if (shedId) {
        const shedRes = await apiFetch(`/api/sheds/${shedId}`);
        if (shedRes.success && shedRes.data) {
          setShedDetails(shedRes.data);
        }

        const recordRes = await apiFetch(`/api/daily-records/today/${shedId}`);
        if (recordRes.success && recordRes.data) {
          setTodayRecord(recordRes.data);
        } else {
          const localRecords = await OfflineStore.getLocalCache("DAILY_RECORD");
          const todayStr = new Date().toISOString().split("T")[0];
          const localToday = localRecords.find((r: any) => r.date === todayStr);
          setTodayRecord(localToday || null);
        }

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
    : 28;

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
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      {/* Top Welcome & Today Status Banner */}
      <View
        style={[
          styles.dayBanner,
          {
            backgroundColor: "#065F46",
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#A7F3D0", fontSize: 12, fontWeight: "700" }}>
            {shedDetails?.name || `SHED ${user?.assignedShedId || "1"}`} • ACTIVE FLOCK
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "900" }}>
            DAY {ageInDays} (Umar: {ageInDays} Din)
          </Text>
          <Text style={{ color: "#D1FAE5", fontSize: 12, marginTop: 2 }}>
            Total Placed: {activeBatch?.chicksPlaced || "19,888"} • Breed: Cobb 500
          </Text>
        </View>

        <View
          style={[
            styles.dayBadgeBox,
            {
              backgroundColor: todayRecord ? "#10B981" : "#F59E0B",
            },
          ]}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800" }}>
            {todayRecord ? "AAJ KI ENTRY COMPLETE" : "ENTRY PENDING"}
          </Text>
        </View>
      </View>

      {/* Main Big Button: Add / Edit Daily Entry */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push("/(worker)/daily-entry")}
        style={[
          styles.bigEntryButton,
          {
            backgroundColor: todayRecord ? colors.secondary : colors.primary,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="notebook-edit-outline"
          size={30}
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
          {todayRecord
            ? "Aaj Ki Entry Dekhein ya Tabdeel Karein"
            : "Aaj Ki Rozana Entry Likhein"}
        </Text>
        <Text style={styles.bigButtonSubtitle}>
          {todayRecord
            ? `Feed: ${todayRecord.feedUsedBags || 0} Bags • Mout: ${todayRecord.mortalityCount || 0} Birds`
            : "Din/Raat Khuraak aur Amwaat darj karein (5 Seconds Entry)"}
        </Text>
      </TouchableOpacity>

      {/* ========================================================================= */}
      {/* 4 DIGITAL REGISTERS (EXACTLY CORRESPONDING TO THE 4 REAL PAPER REGISTERS) */}
      {/* ========================================================================= */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md, marginBottom: spacing.xs }}>
        <MaterialCommunityIcons
          name="book-open-page-variant"
          size={18}
          color={colors.primary}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontSize: typography.sizes.base,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          Farm Paper Registers (Khatay)
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
        Client ke notebook registers ke mutabiq 4 digital khatay:
      </Text>

      <View style={styles.fourRegistersGrid}>
        {/* Register 1: Rozana Register */}
        <TouchableOpacity
          onPress={() => router.push("/(worker)/daily-entry")}
          style={[
            styles.registerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.registerIconCircle, { backgroundColor: "#ECFDF5" }]}>
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={24}
              color="#059669"
            />
          </View>
          <Text style={styles.registerCardTitle}>Rozana Register</Text>
          <Text style={styles.registerCardSub}>
            Photos 1 & 5 • 16-Column Daily Sheet, Closing SF, Birds & Catching
          </Text>
        </TouchableOpacity>

        {/* Register 2: Dawaai Register */}
        <TouchableOpacity
          onPress={() => router.push("/(worker)/vaccinations")}
          style={[
            styles.registerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.registerIconCircle, { backgroundColor: "#FEF3C7" }]}>
            <MaterialCommunityIcons
              name="pill"
              size={24}
              color="#D97706"
            />
          </View>
          <Text style={styles.registerCardTitle}>Dawaai Register</Text>
          <Text style={styles.registerCardSub}>
            Photo 2 • Dawaai Detail, " " " " (Ditto) Copy aur Fast Chips
          </Text>
        </TouchableOpacity>

        {/* Register 3: Khuraak Ledger */}
        <TouchableOpacity
          onPress={() => router.push("/(worker)/history")}
          style={[
            styles.registerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.registerIconCircle, { backgroundColor: "#EFF6FF" }]}>
            <MaterialCommunityIcons
              name="clipboard-list-outline"
              size={24}
              color="#2563EB"
            />
          </View>
          <Text style={styles.registerCardTitle}>Khuraak Ledger</Text>
          <Text style={styles.registerCardSub}>
            Photo 4 • Feed Aayi (In) & Feed Gayi (Out), Party Ledger & Stock
          </Text>
        </TouchableOpacity>

        {/* Register 4: Haftawar Summary */}
        <TouchableOpacity
          onPress={() => router.push("/(worker)/weight")}
          style={[
            styles.registerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.registerIconCircle, { backgroundColor: "#F3E8FF" }]}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={24}
              color="#7C3AED"
            />
          </View>
          <Text style={styles.registerCardTitle}>Haftawar Summary</Text>
          <Text style={styles.registerCardSub}>
            Photo 3 • Weeks 1-6 Cards, Farm Method FCR (62.67), Live Weight
          </Text>
        </TouchableOpacity>
      </View>

      {/* Urgent Vaccine Tasks Banner if any */}
      {pendingVaccines.length > 0 && (
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  dayBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  dayBadgeBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bigEntryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    minHeight: 100,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  bigButtonTitle: {
    color: "#FFFFFF",
  },
  bigButtonSubtitle: {
    color: "#E2E8F0",
    fontSize: 12,
    marginTop: 3,
  },
  sectionTitle: {},
  fourRegistersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  registerCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
  },
  registerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  registerCardTitle: {
    fontWeight: "800",
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 4,
  },
  registerCardSub: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
});
