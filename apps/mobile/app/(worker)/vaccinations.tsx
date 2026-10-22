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
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Button, Card, Badge, Input } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { useTranslation } from "react-i18next";

export default function WorkerVaccinationsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();
  const { t } = useTranslation();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Medicine logging modal/fields
  const [showMedForm, setShowMedForm] = useState(false);
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [reason, setReason] = useState("");
  const [withdrawalDays, setWithdrawalDays] = useState("3");
  const [submittingMed, setSubmittingMed] = useState(false);

  const shedId = user?.assignedShedId || user?.shed?.id;

  const loadTasks = async () => {
    try {
      if (shedId) {
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
    loadTasks();
  }, [shedId]);

  const handleMarkComplete = async (task: any) => {
    try {
      const payload = {
        taskId: task._id,
        completedAt: new Date().toISOString().split("T")[0],
        notes: `Administered by ${user?.name}`,
      };

      await OfflineStore.enqueueMutation("VACCINATION_TASK", "UPDATE", payload);

      // Optimistically update UI
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

  const handleSaveMedicine = async () => {
    if (!medName.trim() || !dosage.trim() || !reason.trim()) {
      Alert.alert("Required", "Please fill medicine name, dosage, and reason.");
      return;
    }

    setSubmittingMed(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const payload = {
        batchId: user?.shed?.currentBatchId || "batch-active",
        shedId,
        date: todayStr,
        medicineName: medName.trim(),
        dosage: dosage.trim(),
        route: "drinking_water",
        reason: reason.trim(),
        withdrawalPeriodDays: parseInt(withdrawalDays, 10) || 0,
      };

      await OfflineStore.enqueueMutation("MEDICINE_RECORD", "CREATE", payload);

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn(e),
        );
      }

      Alert.alert(
        "Dawai Darj Ho Gayi",
        "Medicine treatment logged successfully.",
      );
      setShowMedForm(false);
      setMedName("");
      setDosage("");
      setReason("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save medicine record");
    } finally {
      setSubmittingMed(false);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadTasks();
          }}
          colors={[colors.primary]}
        />
      }
    >
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
          {t("nav.vaccinations")}
        </Text>
        <TouchableOpacity
          onPress={() => setShowMedForm(!showMedForm)}
          style={[styles.addMedButton, { backgroundColor: colors.secondary }]}
        >
          <Text
            style={{
              color: colors.white,
              fontSize: typography.sizes.xs,
              fontWeight: typography.weights.bold,
            }}
          >
            {showMedForm ? "Hide Form" : "+ Log Medicine"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Medicine Form Card */}
      {showMedForm ? (
        <Card
          elevated
          style={{ borderColor: colors.secondary, marginBottom: spacing.md }}
        >
          <Text
            style={{
              color: colors.secondary,
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
              marginBottom: 8,
            }}
          >
            💊 Record Medicine Treatment
          </Text>
          <Input
            label="Medicine Name (Dawai Ka Naam)"
            placeholder="e.g. Enrofloxacin / Colistin"
            value={medName}
            onChangeText={setMedName}
          />
          <Input
            label="Dosage (Miqdar)"
            placeholder="e.g. 1g per 2L water"
            value={dosage}
            onChangeText={setDosage}
          />
          <Input
            label="Reason / Diagnosis (Wajah)"
            placeholder="e.g. Mild coughing / CRD"
            value={reason}
            onChangeText={setReason}
          />
          <Input
            label="Withdrawal Period (Days - Asar Khatam Hone Ke Din)"
            placeholder="3"
            value={withdrawalDays}
            onChangeText={setWithdrawalDays}
            keyboardType="numeric"
            suffix="days"
          />
          <Button
            title="Save Medicine Record"
            onPress={handleSaveMedicine}
            loading={submittingMed}
            variant="secondary"
          />
        </Card>
      ) : null}

      {/* Pending Tasks */}
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
        Pending Tasks ({pendingTasks.length})
      </Text>

      {pendingTasks.length === 0 ? (
        <Card style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 24, marginBottom: 6 }}>🎉</Text>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {t("worker.allVaccinesCompleted")}
          </Text>
        </Card>
      ) : (
        pendingTasks.map((task) => {
          const todayStr = new Date().toISOString().split("T")[0];
          const isOverdue = task.dueDate < todayStr;
          return (
            <Card
              key={task._id}
              elevated
              style={{
                borderColor: isOverdue ? colors.danger : colors.warning,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.sizes.base,
                    fontWeight: typography.weights.bold,
                    flex: 1,
                  }}
                >
                  {task.vaccineName}
                </Text>
                <Badge
                  label={isOverdue ? "OVERDUE" : "DUE"}
                  variant={isOverdue ? "danger" : "warning"}
                  size="sm"
                />
              </View>

              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sizes.xs,
                  marginTop: 4,
                }}
              >
                Route: {task.route} • Age: Day {task.ageInDays} • Due:{" "}
                {task.dueDate}
              </Text>
              {task.notes ? (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.sizes.xs,
                    marginTop: 4,
                    fontStyle: "italic",
                  }}
                >
                  {task.notes}
                </Text>
              ) : null}

              <Button
                title="Mark Done (Teeka Lag Gaya)"
                size="sm"
                onPress={() => handleMarkComplete(task)}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          );
        })
      )}

      {/* Completed Tasks History */}
      <Text
        style={[
          styles.sectionHeader,
          {
            color: colors.text,
            fontSize: typography.sizes.md,
            fontWeight: typography.weights.bold,
            marginTop: spacing.lg,
          },
        ]}
      >
        Completed History ({completedTasks.length})
      </Text>

      {completedTasks.map((task) => (
        <Card key={task._id} style={{ opacity: 0.85, marginVertical: 4 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.semibold,
              }}
            >
              {task.vaccineName}
            </Text>
            <Badge label="DONE" variant="success" size="sm" />
          </View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sizes.xs,
              marginTop: 2,
            }}
          >
            Administered on {task.completedAt}
          </Text>
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
    marginBottom: 10,
  },
  title: {},
  addMedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sectionHeader: {
    marginBottom: 8,
  },
});
