import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Button, Card, Badge, Input } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { useTranslation } from "react-i18next";

interface MedicineItem {
  id: string;
  name: string;
  type:
    | "water_medication"
    | "vitamin"
    | "antibiotic"
    | "respiratory"
    | "acidifier"
    | "vaccine";
  isVaccine: boolean;
  timeOfAdministration: "morning" | "noon" | "evening" | "continuous";
  waterQuantityLiters?: string;
  notes?: string;
}

export default function WorkerVaccinationsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"vaccines" | "water_medication">(
    "vaccines",
  );
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [batchId, setBatchId] = useState<string>("");

  // Daily multi-item medicine sheet state
  const [medItems, setMedItems] = useState<MedicineItem[]>([
    {
      id: "med-1",
      name: "Electrolytes + Vit C",
      type: "vitamin",
      isVaccine: false,
      timeOfAdministration: "morning",
      waterQuantityLiters: "200",
    },
  ]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<any>("vitamin");
  const [submittingSheet, setSubmittingSheet] = useState(false);

  // Common medicine name chips for autocomplete
  const commonMedicines = [
    "Electrolytes + Vit C",
    "Enrofloxacin 10%",
    "Colistin Sulphate",
    "Neomycin",
    "Tylosin Tartrate",
    "Acidifier",
    "Liver Tonic",
    "ND + IB Live",
  ];

  const shedId = user?.assignedShedId || user?.shed?.id;

  const loadData = async () => {
    try {
      if (shedId) {
        const shedRes = await apiFetch(`/api/sheds/${shedId}`);
        const activeBatchId =
          shedRes.data?.currentBatchId || shedRes.data?.activeBatch?._id;
        if (activeBatchId) setBatchId(activeBatchId);

        const res = await apiFetch(`/api/vaccinations/tasks?shedId=${shedId}`);
        if (res.success && res.data) {
          setTasks(res.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shedId]);

  const handleMarkComplete = async (task: any) => {
    try {
      const payload = {
        taskId: task._id,
        completedAt: new Date().toISOString().split("T")[0],
        notes: `Administered by ${user?.name}`,
      };

      await OfflineStore.enqueueMutation("VACCINATION_TASK", "UPDATE", payload);

      setTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? { ...t, status: "completed", completedAt: payload.completedAt }
            : t,
        ),
      );

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn(e),
        );
      }

      Alert.alert(
        "Teeka Lag Gaya! (Success)",
        `${task.vaccineName} marked as completed.`,
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update task");
    }
  };

  // Copy yesterday's medicine list ("Ditto" feature)
  const handleCopyYesterday = async () => {
    try {
      if (!batchId) {
        Alert.alert(
          "Notice",
          "Batch ID not loaded yet. Using standard morning vitamins template.",
        );
        setMedItems([
          {
            id: `med-${Date.now()}-1`,
            name: "Electrolytes + Vit C",
            type: "vitamin",
            isVaccine: false,
            timeOfAdministration: "morning",
          },
          {
            id: `med-${Date.now()}-2`,
            name: "Acidifier",
            type: "acidifier",
            isVaccine: false,
            timeOfAdministration: "noon",
          },
        ]);
        return;
      }

      const res = await apiFetch(
        `/api/vaccinations/medicines/yesterday?batchId=${batchId}&date=${new Date().toISOString().split("T")[0]}`,
      );

      if (res.success && res.data && res.data.length > 0) {
        setMedItems(
          res.data.map((item: any, idx: number) => ({
            id: `ditto-${Date.now()}-${idx}`,
            name: item.name,
            type: item.type || "water_medication",
            isVaccine: Boolean(item.isVaccine),
            timeOfAdministration: item.timeOfAdministration || "morning",
            waterQuantityLiters: item.waterQuantityLiters
              ? item.waterQuantityLiters.toString()
              : "",
            notes: item.notes || "",
          })),
        );
        Alert.alert(
          "Ditto Kamyab!",
          "Kal wali dawaiyan aaj ke list mein shamil ho gayin.",
        );
      } else {
        Alert.alert(
          "Info",
          "Kal ka koi purana medicine record nahi mila. Standard template shamil kar diya hai.",
        );
      }
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.message || "Could not fetch yesterday's medicines",
      );
    }
  };

  const handleAddItem = (nameToAdd?: string) => {
    const name = (nameToAdd || newItemName).trim();
    if (!name) return;

    setMedItems((prev) => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        name,
        type: newItemType,
        isVaccine: false,
        timeOfAdministration: "morning",
      },
    ]);
    setNewItemName("");
  };

  const handleRemoveItem = (id: string) => {
    setMedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveDailyMedicineSheet = async () => {
    if (medItems.length === 0) {
      Alert.alert(
        "Required",
        "Kam az kam aik dawai ya supplement darj karein.",
      );
      return;
    }

    setSubmittingSheet(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const payload = {
        batchId: batchId || "batch-active",
        shedId,
        date: todayStr,
        items: medItems.map((item) => ({
          name: item.name,
          type: item.type,
          isVaccine: item.isVaccine,
          timeOfAdministration: item.timeOfAdministration,
          waterQuantityLiters: item.waterQuantityLiters
            ? parseFloat(item.waterQuantityLiters)
            : undefined,
          notes: item.notes,
        })),
      };

      await OfflineStore.enqueueMutation("DAILY_MEDICINE", "CREATE", payload);

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn(e),
        );
      }

      Alert.alert(
        "Dawai Darj Ho Gayi!",
        "Aaj ka medicine khata kamyabi se phone mein mehfooz ho gaya hai.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save medicine sheet");
    } finally {
      setSubmittingSheet(false);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          padding: spacing.base,
          maxWidth: 640,
          alignSelf: "center",
          width: "100%",
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Veterinary Verification Mandatory Disclaimer Banner */}
      <Card
        style={{
          backgroundColor: colors.warningBg,
          borderColor: colors.warning,
          marginBottom: spacing.md,
          borderWidth: 1.5,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons
            name="medical-bag"
            size={16}
            color={colors.warning}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{ color: colors.warning, fontWeight: "700", fontSize: 13 }}
          >
            Veterinary Notice
          </Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
          Vaccination schedules and Cobb 500 target curves must be verified and
          approved by a registered poultry veterinarian.
        </Text>
      </Card>

      {/* Screen Title */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.bold,
            },
          ]}
        >
          {t("nav.vaccinations")} (Teekay Aur Dawaiyan)
        </Text>
      </View>

      {/* Segmented Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab("vaccines")}
          testID="tab-vaccines"
          style={[
            styles.tabItem,
            {
              backgroundColor:
                activeTab === "vaccines" ? colors.primary : colors.surface,
              borderColor:
                activeTab === "vaccines" ? colors.primary : colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="needle"
            size={16}
            color={activeTab === "vaccines" ? "#fff" : colors.text}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: activeTab === "vaccines" ? "#fff" : colors.text,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            Scheduled Vaccines ({pendingTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("water_medication")}
          testID="tab-water-medication"
          style={[
            styles.tabItem,
            {
              backgroundColor:
                activeTab === "water_medication"
                  ? colors.secondary
                  : colors.surface,
              borderColor:
                activeTab === "water_medication"
                  ? colors.secondary
                  : colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="pill"
            size={16}
            color={activeTab === "water_medication" ? "#fff" : colors.text}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: activeTab === "water_medication" ? "#fff" : colors.text,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            Water Medicines ({medItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: SCHEDULED VACCINES */}
      {activeTab === "vaccines" ? (
        <View>
          <Text
            style={[
              styles.sectionHeader,
              {
                color: colors.text,
                fontSize: typography.sizes.md,
                fontWeight: typography.weights.bold,
                marginTop: spacing.sm,
              },
            ]}
          >
            Pending Vaccines ({pendingTasks.length})
          </Text>

          {pendingTasks.length === 0 ? (
            <Card style={{ padding: 16, alignItems: "center" }}>
              <Ionicons
                name="checkmark-done-circle"
                size={36}
                color={colors.success}
                style={{ marginBottom: 6 }}
              />
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {t("worker.allVaccinesCompleted")}
              </Text>
            </Card>
          ) : (
            pendingTasks.map((task) => (
              <Card
                key={task._id}
                elevated
                style={{
                  marginVertical: 6,
                  borderColor: colors.warning,
                  borderLeftWidth: 4,
                }}
              >
                <View style={styles.taskCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "700",
                        fontSize: 15,
                      }}
                    >
                      {task.vaccineName}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Day {task.ageInDays} • Due: {task.dueDate}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      Route: {task.route}
                    </Text>
                  </View>

                  <Badge label="DUE" variant="warning" size="sm" />
                </View>

                <View style={{ marginTop: 10 }}>
                  <Button
                    title="Mark Administered"
                    size="sm"
                    onPress={() => handleMarkComplete(task)}
                  />
                </View>
              </Card>
            ))
          )}

          {completedTasks.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text
                style={[
                  styles.sectionHeader,
                  {
                    color: colors.textSecondary,
                    fontSize: typography.sizes.sm,
                    fontWeight: typography.weights.bold,
                  },
                ]}
              >
                Completed Vaccines ({completedTasks.length})
              </Text>
              {completedTasks.map((task) => (
                <Card
                  key={task._id}
                  style={{ marginVertical: 4, opacity: 0.8 }}
                >
                  <View style={styles.taskCardHeader}>
                    <View>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "600",
                          textDecorationLine: "line-through",
                        }}
                      >
                        {task.vaccineName}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        Completed: {task.completedAt}
                      </Text>
                    </View>
                    <Badge label="COMPLETED" variant="success" size="sm" />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      ) : (
        /* TAB 2: WATER MEDICATION & SUPPLEMENTS (DAILY SHEET) */
        <View>
          {/* Ditto Action Header */}
          <View style={styles.dittoHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}
              >
                Rozana Dawai Ka Khata
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                4-8 items rozana (Vitamins, Electrolytes, Antibiotics)
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCopyYesterday}
              testID="copy-yesterday-btn"
              style={[
                styles.dittoBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.secondary,
                  flexDirection: "row",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons
                name="copy-outline"
                size={14}
                color={colors.secondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: colors.secondary,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                Copy Yesterday (Ditto)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Autocomplete Quick Chips */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            Jaldi Select Karein (Frequent Medicines):
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
          >
            {commonMedicines.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => handleAddItem(m)}
                testID={`autocomplete-chip-${m.replace(/[^a-zA-Z0-9]/g, "")}`}
                style={[
                  styles.medChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  + {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Add Medicine Input */}
          <Card elevated style={{ marginVertical: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  testID="new-med-input"
                  placeholder="Dawai Ka Naam (e.g. Enrofloxacin)"
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
              </View>
              <Button
                testID="add-med-item-btn"
                title="+ Add"
                size="sm"
                onPress={() => handleAddItem()}
              />
            </View>
          </Card>

          {/* Current Day's Items List */}
          <Text
            style={{ fontWeight: "700", color: colors.text, marginVertical: 6 }}
          >
            Aaj Di Jane Wali Dawaiyan ({medItems.length} Items):
          </Text>

          {medItems.map((item, idx) => (
            <Card key={item.id} style={{ marginVertical: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {idx + 1}. {item.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 11,
                      textTransform: "capitalize",
                    }}
                  >
                    Waqt: {item.timeOfAdministration} • Qisam:{" "}
                    {item.type.replace("_", " ")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleRemoveItem(item.id)}
                  testID={`remove-med-${idx}`}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>
            </Card>
          ))}

          {/* Save Sheet Button */}
          <View style={{ marginTop: spacing.md }}>
            <Button
              testID="save-medicine-sheet-btn"
              title="Save Today's Medicine List (Khata Mehfooz Karein)"
              onPress={handleSaveDailyMedicineSheet}
              loading={submittingSheet}
              variant="secondary"
              size="lg"
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 80,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {},
  tabBar: {
    flexDirection: "row",
    marginVertical: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 3,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  taskCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dittoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  dittoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  chipsScroll: {
    flexDirection: "row",
    marginBottom: 8,
  },
  medChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
});
