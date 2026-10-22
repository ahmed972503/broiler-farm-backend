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
import { Button, Input, Card } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { bagsToKg } from "@broiler/shared";
import { useTranslation } from "react-i18next";

export default function DailyEntryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();
  const router = useRouter();
  const { t } = useTranslation();

  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(todayStr);
  const [mortality, setMortality] = useState("0");
  const [mortalityCause, setMortalityCause] = useState("");
  const [culls, setCulls] = useState("0");
  const [feedBags, setFeedBags] = useState("8");
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

  useEffect(() => {
    // Determine active batch for worker's shed
    const fetchShedBatch = async () => {
      const shedId = user?.assignedShedId || user?.shed?.id;
      if (shedId) {
        const res = await apiFetch(`/api/sheds/${shedId}`);
        if (res.success && res.data?.currentBatchId) {
          setBatchId(res.data.currentBatchId);
        } else if (res.data?.activeBatch?._id) {
          setBatchId(res.data.activeBatch._id);
        }
      }
    };
    fetchShedBatch();
  }, [user]);

  const addMortality = (val: number) => {
    const curr = parseInt(mortality, 10) || 0;
    setMortality(Math.max(0, curr + val).toString());
  };

  const calculatedKg = bagsToKg(parseFloat(feedBags) || 0);

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
      mortalityCount: parseInt(mortality, 10) || 0,
      mortalityCause: mortalityCause.trim(),
      culls: parseInt(culls, 10) || 0,
      feedUsedBags: parseFloat(feedBags) || 0,
      feedUsedKg: calculatedKg,
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

      // 2. Attempt sync if online
      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn("Background sync", e),
        );
      }

      Alert.alert(
        "Mehfooz Ho Gaya! (Saved)",
        "Aaj ka record kamyabi se darj ho gaya hai.",
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
    >
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
            marginBottom: spacing.md,
          },
        ]}
      >
        {date} • Tareekh
      </Text>

      {/* 1. Mortality (Murda Choozay) with fast touch increments */}
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
          💀 {t("daily.mortality")} (Mout)
        </Text>

        <View style={styles.quickCounterRow}>
          <TouchableOpacity
            onPress={() => addMortality(1)}
            style={[
              styles.stepperButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.stepperText, { color: colors.text }]}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => addMortality(5)}
            style={[
              styles.stepperButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.stepperText, { color: colors.text }]}>+5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => addMortality(-1)}
            style={[
              styles.stepperButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.stepperText, { color: colors.text }]}>-1</Text>
          </TouchableOpacity>
        </View>

        <Input
          placeholder="0"
          value={mortality}
          onChangeText={setMortality}
          keyboardType="numeric"
          suffix={t("common.birds")}
          inputStyle={{ fontSize: 24, fontWeight: "700", textAlign: "center" }}
        />

        <Input
          label={t("daily.mortalityCause")}
          placeholder="Wajah (e.g. garmi, kamzori, normal)"
          value={mortalityCause}
          onChangeText={setMortalityCause}
        />

        <Input
          label={t("daily.culls")}
          placeholder="0"
          value={culls}
          onChangeText={setCulls}
          keyboardType="numeric"
          suffix={t("common.birds")}
        />
      </Card>

      {/* 2. Feed & Water (Khorak Aur Paani) */}
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
                  color: feedType === type ? colors.white : colors.text,
                  fontWeight: "600",
                  fontSize: typography.sizes.xs,
                  textTransform: "capitalize",
                }}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Bags Consumed (Borian)"
          placeholder="8.0"
          value={feedBags}
          onChangeText={setFeedBags}
          keyboardType="decimal-pad"
          suffix={t("common.bags")}
          helperText={`= ${calculatedKg} kg (at 50 kg/bag)`}
        />

        <Input
          label={t("daily.waterLiters")}
          placeholder="600"
          value={waterLiters}
          onChangeText={setWaterLiters}
          keyboardType="numeric"
          suffix={t("common.liters")}
        />
      </Card>

      {/* 3. Environment (Darja Hararat & Bichauna) */}
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
          🌡️ Temperature & Litter (Bichauna)
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 0.48 }}>
            <Input
              label={t("daily.minTemp")}
              placeholder="24.0"
              value={minTemp}
              onChangeText={setMinTemp}
              keyboardType="decimal-pad"
              suffix="°C"
            />
          </View>
          <View style={{ flex: 0.48 }}>
            <Input
              label={t("daily.maxTemp")}
              placeholder="30.0"
              value={maxTemp}
              onChangeText={setMaxTemp}
              keyboardType="decimal-pad"
              suffix="°C"
            />
          </View>
        </View>

        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.semibold,
            marginBottom: 8,
          }}
        >
          {t("daily.litter")}
        </Text>
        <View style={styles.selectorRow}>
          {[
            { key: "dry", label: t("daily.dry") },
            { key: "normal", label: t("daily.normal") },
            { key: "wet", label: t("daily.wet") },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setLitter(opt.key as any)}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    litter === opt.key ? colors.secondary : colors.surface,
                  borderColor:
                    litter === opt.key ? colors.secondary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: litter === opt.key ? colors.white : colors.text,
                  fontWeight: "600",
                  fontSize: typography.sizes.xs,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Notes (Izafi Baat)"
          placeholder={t("daily.notesPlaceholder")}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />
      </Card>

      {/* Submit Button */}
      <Button
        title={
          loading ? "Mehfooz Ho Raha Hai..." : "Mehfooz Karein (Submit Entry)"
        }
        size="lg"
        loading={loading}
        onPress={handleSubmit}
        style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
  },
  screenTitle: {
    marginBottom: 2,
  },
  screenSubtitle: {},
  cardHeader: {
    marginBottom: 12,
  },
  quickCounterRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepperButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 6,
  },
  stepperText: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
