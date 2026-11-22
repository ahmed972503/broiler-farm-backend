import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../src/theme";
import { Card, Badge, Button, Input } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function ShedsListScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const [sheds, setSheds] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Shed Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShedName, setNewShedName] = useState("");
  const [newShedCapacity, setNewShedCapacity] = useState("5000");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [savingShed, setSavingShed] = useState(false);

  // Assign Worker Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeShedForAssign, setActiveShedForAssign] = useState<any>(null);
  const [assignWorkerId, setAssignWorkerId] = useState<string | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);

  const loadData = async () => {
    try {
      // 1. Load Sheds
      const res = await apiFetch("/api/sheds");
      if (res.success && res.data) {
        setSheds(res.data);
      }

      // 2. Load Workers for assignment
      const usersRes = await apiFetch("/api/auth/users");
      if (usersRes.success && usersRes.data) {
        const workerList = usersRes.data.filter((u: any) => u.role === "worker");
        setWorkers(workerList);
      }
    } catch (err) {
      console.warn("Failed to load sheds or workers", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    const nextNumber = sheds.length + 1;
    setNewShedName(`Shed ${nextNumber}`);
    setNewShedCapacity("5000");
    setSelectedWorkerId(workers.length > 0 ? workers[0].id || workers[0]._id : null);
    setShowAddModal(true);
  };

  const handleCreateShed = async () => {
    if (!newShedName.trim()) {
      Alert.alert("Required", "Shed name is required");
      return;
    }
    const cap = parseInt(newShedCapacity, 10);
    if (isNaN(cap) || cap <= 0) {
      Alert.alert("Invalid Capacity", "Please enter a valid bird capacity (e.g. 5000)");
      return;
    }

    setSavingShed(true);
    try {
      const res = await apiFetch("/api/sheds", {
        method: "POST",
        body: JSON.stringify({
          name: newShedName.trim(),
          capacity: cap,
          assignedWorkerId: selectedWorkerId || null,
        }),
      });

      if (res.success) {
        setShowAddModal(false);
        loadData();
        Alert.alert("Success", `${newShedName} has been created successfully!`);
      } else {
        Alert.alert("Error", res.error || "Failed to create shed");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create shed");
    } finally {
      setSavingShed(false);
    }
  };

  const handleOpenAssignModal = (shed: any) => {
    setActiveShedForAssign(shed);
    const currentWorkerId = shed.assignedWorkerId?._id || shed.assignedWorkerId?.id || shed.assignedWorkerId || null;
    setAssignWorkerId(currentWorkerId);
    setShowAssignModal(true);
  };

  const handleSaveWorkerAssignment = async () => {
    if (!activeShedForAssign) return;
    setSavingAssign(true);
    try {
      const shedId = activeShedForAssign._id || activeShedForAssign.id;
      const res = await apiFetch(`/api/sheds/${shedId}`, {
        method: "PUT",
        body: JSON.stringify({
          assignedWorkerId: assignWorkerId,
        }),
      });

      if (res.success) {
        setShowAssignModal(false);
        setActiveShedForAssign(null);
        loadData();
        Alert.alert("Success", "Worker assigned successfully!");
      } else {
        Alert.alert("Error", res.error || "Failed to assign worker");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to assign worker");
    } finally {
      setSavingAssign(false);
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
            loadData();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header with Title and Add Shed Button */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            Farm Sheds (Darrhay)
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}
          >
            Broiler houses, worker assignments & active flock monitoring
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleOpenAddModal}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={[styles.addBtnText, { color: colors.white }]}>
            + Add Shed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {sheds.length === 0 && !loading && (
        <Card elevated style={{ padding: 24, alignItems: "center", marginTop: 20 }}>
          <Ionicons name="home-outline" size={48} color={colors.textSecondary} />
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginTop: 12,
            }}
          >
            No Sheds Registered Yet
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              textAlign: "center",
              marginTop: 6,
              marginBottom: 16,
            }}
          >
            Add your first broiler shed to start placing chick flocks and assigning workers.
          </Text>
          <Button
            title="+ Add First Shed"
            onPress={handleOpenAddModal}
            size="md"
          />
        </Card>
      )}

      {/* Shed Cards */}
      {sheds.map((shed) => {
        const batch = shed.currentBatch;
        const assignedWorkerName =
          shed.assignedWorkerId?.name ||
          (typeof shed.assignedWorkerId === "string" ? shed.assignedWorkerId : null) ||
          "Unassigned (Admin/Owner)";

        return (
          <Card key={shed._id || shed.id} elevated style={{ marginVertical: 8 }}>
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
                    fontSize: typography.sizes.lg,
                    fontWeight: typography.weights.bold,
                  }}
                >
                  {shed.name}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.sizes.xs,
                    marginTop: 2,
                  }}
                >
                  Capacity: {Number(shed.capacity).toLocaleString()} birds
                </Text>
              </View>

              <Badge
                label={(shed.status || "active").toUpperCase()}
                variant={
                  shed.status === "active"
                    ? "success"
                    : shed.status === "cleaning"
                      ? "warning"
                      : "neutral"
                }
              />
            </View>

            {/* Worker Assignment Strip */}
            <View
              style={[
                styles.workerStrip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                    Assigned In-charge:
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {assignedWorkerName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleOpenAssignModal(shed)}
                style={[
                  styles.changeWorkerBtn,
                  { borderColor: colors.primary, backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  Change Worker
                </Text>
              </TouchableOpacity>
            </View>

            {/* Flock Info */}
            {batch ? (
              <View
                style={[
                  styles.flockInfo,
                  {
                    backgroundColor: colors.surface,
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 8,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  Active Flock: {batch.batchNumber} (Day {batch.ageInDays})
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Remaining: {batch.birdsRemaining?.toLocaleString()} birds •
                  Cumulative Mortality: {batch.cumulativeMortality}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  marginTop: 8,
                  fontStyle: "italic",
                }}
              >
                Currently empty / ready for new placement
              </Text>
            )}

            <Button
              title="View Shed Details"
              variant="outline"
              size="sm"
              onPress={() => router.push(`/(admin)/sheds/${shed._id || shed.id}` as any)}
              style={{ marginTop: 12 }}
            />
          </Card>
        );
      })}

      {/* MODAL 1: ADD NEW SHED */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                + Add New Shed (Naya Darrha)
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Shed Name"
              placeholder="e.g. Shed 6"
              value={newShedName}
              onChangeText={setNewShedName}
            />

            <Input
              label="Bird Capacity (Max Chooray)"
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={newShedCapacity}
              onChangeText={setNewShedCapacity}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Assign Worker (In-charge Muqarrar Karein):
            </Text>
            <View style={styles.workerSelectWrap}>
              <TouchableOpacity
                onPress={() => setSelectedWorkerId(null)}
                style={[
                  styles.workerChip,
                  selectedWorkerId === null && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.workerChipText,
                    selectedWorkerId === null ? { color: colors.white } : { color: colors.text },
                  ]}
                >
                  Admin / Unassigned
                </Text>
              </TouchableOpacity>

              {workers.map((w) => {
                const wId = w.id || w._id;
                const isSelected = selectedWorkerId === wId;
                return (
                  <TouchableOpacity
                    key={wId}
                    onPress={() => setSelectedWorkerId(wId)}
                    style={[
                      styles.workerChip,
                      isSelected && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.workerChipText,
                        isSelected ? { color: colors.white } : { color: colors.text },
                      ]}
                    >
                      {w.name} ({w.username})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Create Shed"
              onPress={handleCreateShed}
              loading={savingShed}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ASSIGN WORKER TO SHED */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Assign Worker: {activeShedForAssign?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              Is shed ke liye worker muntakhib karein jo daily entry aur khata manage karega:
            </Text>

            <View style={styles.workerSelectWrap}>
              <TouchableOpacity
                onPress={() => setAssignWorkerId(null)}
                style={[
                  styles.workerChip,
                  assignWorkerId === null && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.workerChipText,
                    assignWorkerId === null ? { color: colors.white } : { color: colors.text },
                  ]}
                >
                  No Worker (Admin Only)
                </Text>
              </TouchableOpacity>

              {workers.map((w) => {
                const wId = w.id || w._id;
                const isSelected = assignWorkerId === wId;
                return (
                  <TouchableOpacity
                    key={wId}
                    onPress={() => setAssignWorkerId(wId)}
                    style={[
                      styles.workerChip,
                      isSelected && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.workerChipText,
                        isSelected ? { color: colors.white } : { color: colors.text },
                      ]}
                    >
                      {w.name} ({w.username})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title="Save Assignment"
              onPress={handleSaveWorkerAssignment}
              loading={savingAssign}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>
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
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 8,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },
  workerStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  changeWorkerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  flockInfo: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 14,
    padding: 20,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  workerSelectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  workerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  workerChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
