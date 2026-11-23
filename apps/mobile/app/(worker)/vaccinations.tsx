import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { Button, Card, Badge } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";

// Real historical medicine log directly from farm notebook (Photo 2)
const SAMPLE_MEDICINE_LOG: {
  day: number;
  date: string;
  detail: string;
  isDitto?: boolean;
}[] = [
  { day: 1, date: "26-Apr", detail: "Captent + I.B + Biozyme + Growvite" },
  { day: 2, date: "27-Apr", detail: "Growvite + Amoxy + Glucose + Biozyme" },
  { day: 3, date: "28-Apr", detail: "Growvite + Amoxy + Biozyme + Glucose" },
  {
    day: 4,
    date: "29-Apr",
    detail: "Flushing (Sugar + Vinegar) + FRA C-12 + Neovit-Fort + Paracetamol + E-coli",
  },
  {
    day: 5,
    date: "30-Apr",
    detail: "ND-Killed inj + Glucose / Sharbat-e-Faulad + Liver + Amoxy",
  },
  { day: 6, date: "1-May", detail: "FRA C-12 + Vitamin + Liver + Amoxy" },
  {
    day: 7,
    date: "2-May",
    detail: "FRA C-12 + Liver Tonic + Vaccine + Paracetamol + Neovit fort",
  },
  {
    day: 8,
    date: "3-May",
    detail: "FRA C-12 + Liver + Growvite + Biozyme + Adek",
  },
  {
    day: 9,
    date: "4-May",
    detail: "Respifine + Aminophyllin + Glucose + Vitamin C + Liver + Colistin + Sulfa",
  },
  {
    day: 10,
    date: "5-May",
    detail: "Ventilin + Allergy + Glucose + Aminophyllin + Paracetamol + Byzogold + Mucolator",
  },
  {
    day: 11,
    date: "6-May",
    detail: "Ventilin + Allergy + Glucose + Aminophyllin + Paracetamol + Sugar + Biozyme + Mucolator",
  },
  {
    day: 12,
    date: "7-May",
    detail: "Ventilin + Allergy + Glucose + Aminophyllin + Paracetamol + Sugar + Mucolator + Sulfa",
  },
  {
    day: 13,
    date: "8-May",
    detail: "Ventilin + Allergy + Glucose + Aminophyllin + Paracetamol + Biozyme + Mucolator + Sulfa",
  },
  {
    day: 14,
    date: "9-May",
    detail: "Ventilin + Allergy + Glucose + Liver + Adek + FRA C-12 + Mucolator + Biozyme + Lincomicine",
  },
  {
    day: 15,
    date: "10-May",
    detail: "Ventilin + Allergy + Glucose + Acid + Liver + Growvite + Adek + FRA C-12 + Mucolator",
  },
  {
    day: 16,
    date: "11-May",
    detail: "Ventilin + Allergy + Acid + Liver + Growvite + FRA C-12 + Lincomicine + Mucolator",
  },
  {
    day: 17,
    date: "12-May",
    detail: "Respifine + Aminophyllin + Adek + Biozyme + Lincomicine + Vitamin C + Mucolator",
  },
  {
    day: 18,
    date: "13-May",
    detail: "E-coli + FRA C-12 + Respifine + Ventilin + Allergy + Aminophyllin + Dextromethorphan + Lincomicine",
  },
  {
    day: 19,
    date: "14-May",
    detail: "Allergy + Liver + Paracetamol + Bromhexine + Ventilin + FRA C-12 + Vitamin C + Mucolator",
  },
  {
    day: 20,
    date: "15-May",
    detail: "Adek + Allergy + Liver + Paracetamol + Bromhexine + Ventilin + FRA C-12 + Glucose + Mucolator",
  },
  {
    day: 21,
    date: "16-May",
    detail: "FRA C-12 + Adek + Neovit-Fort + Bromhexine + Ventilin + Paracetamol + Mucolator",
  },
  {
    day: 22,
    date: "17-May",
    detail: "Respifine + Aminophyllin + Adek + Biozyme + Lincomicine + Vitamin C",
  },
  {
    day: 23,
    date: "18-May",
    detail: "Liver + FRA C-12 + Respifine + Mucolator + Ventilin + Aminophyllin + Adek",
  },
  {
    day: 24,
    date: "19-May",
    detail: "Polystress + Respifine + Allergy + Mucolator + Ventilin + Aminophyllin + Adek",
  },
  {
    day: 25,
    date: "20-May",
    detail: "Polystress + Allergy + Paracetamol + Respifine + FRA C-12 + Sharbat-e-Faulad + Mucolator",
  },
  {
    day: 26,
    date: "21-May",
    detail: "Bromhexine + Allergy + Paracetamol + Aminophyllin + Fancet + Tyloce",
  },
  {
    day: 27,
    date: "22-May",
    detail: "Bromhexine + Allergy + Paracetamol + Aminophyllin + Mucolator + Vitamin C + Liver + Biozyme",
  },
  {
    day: 28,
    date: "23-May",
    detail: "Ventilin + Mucolator + Allergy + Respifine + Sugar + Growvite + Tyloce",
  },
  {
    day: 29,
    date: "24-May",
    detail: "Mucolator + Ventilin + Allergy + Respifine + Colistin + Spectrum",
  },
  {
    day: 30,
    date: "25-May",
    detail: '"  "  "  + FRA C-12 + Vitamin C + Liver + Enrofloxacine + Spectrum',
    isDitto: true,
  },
  {
    day: 31,
    date: "26-May",
    detail: '"  "  "  + Neovit fort + Mucolator + Allergy + Favocet + Cholical + Vitamin C + Paracetamol',
    isDitto: true,
  },
  {
    day: 32,
    date: "27-May",
    detail: '"  "  "  + Favocet + Spectrum',
    isDitto: true,
  },
  {
    day: 33,
    date: "28-May",
    detail: '"  "  "  + Tika + Colistin + Neomicine + Florol',
    isDitto: true,
  },
  {
    day: 34,
    date: "29-May",
    detail: "Neovit fort + Ventilin + Colistin + Neomicine + Florol",
  },
  {
    day: 35,
    date: "30-May",
    detail: "Amoxytin + Amoxytab + Acid + Liver + Vitamin C",
  },
  {
    day: 36,
    date: "31-May",
    detail: '"  "  "  " (Pichle Din Jaisi)',
    isDitto: true,
  },
  {
    day: 37,
    date: "1-June",
    detail: '"  "  "  " (Pichle Din Jaisi)',
    isDitto: true,
  },
  {
    day: 38,
    date: "2-June",
    detail: "Neomycin + Endox + Amox + Linco + Promote + Acid + Liver + Vitamin C",
  },
  {
    day: 39,
    date: "3-June",
    detail: "Promote + Polstress + Biozyme + Neovit fort + C + Acid + Liver + Neomycin",
  },
  {
    day: 40,
    date: "4-June",
    detail: "Enzor + Neomycin + Polstress + Biozyme + Vitamin C + Spectrum",
  },
  {
    day: 41,
    date: "5-June",
    detail: "Acid + Vitamin C + Biozyme + Belkin + Paracetamol + Spectrum",
  },
  {
    day: 42,
    date: "6-June",
    detail: "Acid + Polystress + Flushing + Vitamin C + Belkin + Paracetamol + Spectrum",
  },
  {
    day: 43,
    date: "7-June",
    detail: "Acid + Polystress + Neovit-Fort + Vitamin C + Enrofloxacine + Neomicine",
  },
  {
    day: 44,
    date: "8-June",
    detail: "Ventilin + Paracetamol + Fancet + Biozyme + Neovit fort",
  },
  {
    day: 45,
    date: "9-June",
    detail: "Vitamin C + Biozyme + Index + Enrofloxacine + Neovit fort",
  },
];

// Common quick-add chips for fast 1-tap medicine input
const COMMON_MEDICINE_CHIPS = [
  "Biozyme",
  "Growvite",
  "Amoxy",
  "Glucose",
  "Paracetamol",
  "FRA C-12",
  "Respifine",
  "Mucolator",
  "Ventilin",
  "Neovit-Fort",
  "Vitamin C",
  "Acidifier",
  "Colistin",
  "Liver Tonic",
];

export default function WorkerVaccinationsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();

  const [activeTab, setActiveTab] = useState<"register" | "tasks">("register");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [batchId, setBatchId] = useState<string>("");

  // Medicine entries state
  const [entries, setEntries] = useState(SAMPLE_MEDICINE_LOG);
  const [selectedDay, setSelectedDay] = useState<number>(28);
  const [medicineInput, setMedicineInput] = useState<string>(
    "Ventilin + Mucolator + Allergy + Respifine + Sugar + Growvite + Tyloce",
  );
  const [submitting, setSubmitting] = useState(false);

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

  // " " " " (Pichle Din Jaisi / Ditto) Button Handler
  const handleDittoCopy = () => {
    const yesterdayDay = selectedDay > 1 ? selectedDay - 1 : 1;
    const yesterdayEntry = entries.find((e) => e.day === yesterdayDay);

    if (yesterdayEntry) {
      setMedicineInput(`"  "  "  " (${yesterdayEntry.detail})`);
      Alert.alert(
        'Ditto Lag Gaya! (" " " ")',
        `Pichle din (Day ${yesterdayDay}) ki dawaai copy ho gayi hai:\n\n${yesterdayEntry.detail}`,
      );
    } else {
      setMedicineInput('"  "  "  " (Pichle Din Jaisi)');
    }
  };

  // Append a chip to current medicine line with " + "
  const handleAddChip = (chipName: string) => {
    if (!medicineInput.trim()) {
      setMedicineInput(chipName);
    } else if (medicineInput.includes(chipName)) {
      return;
    } else {
      setMedicineInput(`${medicineInput} + ${chipName}`);
    }
  };

  // Save Today's Medicine
  const handleSaveMedicine = async () => {
    if (!medicineInput.trim()) {
      Alert.alert("Dawaai Likhein", "Baraye meharbani dawaai ka naam likhein.");
      return;
    }

    setSubmitting(true);
    try {
      setEntries((prev) =>
        prev.map((e) =>
          e.day === selectedDay
            ? { ...e, detail: medicineInput.trim(), isDitto: medicineInput.includes('"') }
            : e,
        ),
      );

      const payload = {
        shedId,
        batchId: batchId || "active-batch",
        dayNumber: selectedDay,
        medicineDetails: medicineInput.trim(),
        loggedAt: new Date().toISOString(),
      };

      await OfflineStore.enqueueMutation("VACCINATION_TASK", "CREATE", payload);

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn("Sync error", e),
        );
      }

      Alert.alert(
        "Mehfooz Ho Gaya!",
        `Day ${selectedDay} ki dawaai register mein darj ho gayi hai.`,
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save medicine entry");
    } finally {
      setSubmitting(false);
    }
  };

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
        "Teeka Lag Gaya!",
        `${task.vaccineName} marked as completed.`,
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update task");
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
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
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* 1. Clean Simple Header */}
      <View style={styles.cleanHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="pill"
              size={22}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              Dawaai Register
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            Shed 1 • Choozay Ki Umar: Day {selectedDay}
          </Text>
        </View>

        {/* Day Navigator */}
        <View style={styles.dayPickerPill}>
          <TouchableOpacity
            onPress={() => setSelectedDay(Math.max(1, selectedDay - 1))}
            style={styles.dayNavArrow}
          >
            <Ionicons name="chevron-back" size={16} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.dayNavText}>Day {selectedDay}</Text>
          <TouchableOpacity
            onPress={() => setSelectedDay(Math.min(45, selectedDay + 1))}
            style={styles.dayNavArrow}
          >
            <Ionicons name="chevron-forward" size={16} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Compact, Super-Easy Entry Box */}
      <View style={styles.simpleEntryBox}>
        <Text style={styles.boxLabel}>
          Aaj Ki Dawaai (Day {selectedDay}):
        </Text>

        <TextInput
          value={medicineInput}
          onChangeText={setMedicineInput}
          placeholder="Dawaai ka naam likhein (e.g. Biozyme + Growvite)..."
          multiline
          numberOfLines={2}
          style={styles.simpleTextInput}
        />

        {/* Fast Chips: Single horizontal scroll row (neat, zero screen clutter) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalChipsRow}
          contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        >
          {COMMON_MEDICINE_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              onPress={() => handleAddChip(chip)}
              style={[
                styles.minimalChip,
                medicineInput.includes(chip) && styles.minimalChipActive,
              ]}
            >
              <Text
                style={[
                  styles.minimalChipText,
                  medicineInput.includes(chip) && styles.minimalChipTextActive,
                ]}
              >
                + {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action Buttons: Ditto & Save side-by-side */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={handleDittoCopy}
            style={styles.dittoButton}
          >
            <MaterialCommunityIcons
              name="content-copy"
              size={16}
              color="#047857"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.dittoButtonText}>
              Kal Jaisi (Ditto)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveMedicine}
            style={styles.saveButton}
          >
            <MaterialCommunityIcons
              name="check"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.saveButtonText}>
              {submitting ? "Saving..." : "Mehfooz Karein"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. The Digital Ruled Notebook Register Table (Clean & Paper-like) */}
      <View style={styles.notebookCard}>
        <View style={styles.notebookHeaderRow}>
          <Text style={[styles.colHead, { width: 75 }]}>DATE</Text>
          <Text style={[styles.colHead, { width: 45 }]}>DAY</Text>
          <Text style={[styles.colHead, { flex: 1, textAlign: "left", paddingLeft: 8 }]}>
            DAWAAI KI TAFSEEL
          </Text>
        </View>

        {entries.map((item, idx) => {
          const isSelected = item.day === selectedDay;
          return (
            <TouchableOpacity
              key={item.day}
              onPress={() => {
                setSelectedDay(item.day);
                setMedicineInput(item.detail);
              }}
              style={[
                styles.notebookRow,
                {
                  backgroundColor: isSelected
                    ? "#ECFDF5"
                    : idx % 2 === 0
                      ? "#FFFFFF"
                      : "#F8FAFC",
                  borderLeftColor: isSelected ? "#059669" : "transparent",
                  borderLeftWidth: isSelected ? 4 : 0,
                },
              ]}
            >
              <View style={[styles.colCell, { width: isSelected ? 71 : 75 }]}>
                <Text
                  style={[
                    styles.dateText,
                    isSelected && { color: "#059669", fontWeight: "800" },
                  ]}
                >
                  {item.date}
                </Text>
              </View>

              <View style={[styles.colCell, { width: 45 }]}>
                <Text
                  style={[
                    styles.dayText,
                    isSelected && { color: "#059669", fontWeight: "800" },
                  ]}
                >
                  {item.day}
                </Text>
              </View>

              <View
                style={[
                  styles.colCell,
                  { flex: 1, alignItems: "flex-start", paddingLeft: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.medText,
                    item.isDitto && { color: "#B45309", fontStyle: "italic", fontWeight: "700" },
                  ]}
                >
                  {item.detail}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  cleanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayPickerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dayNavArrow: {
    padding: 4,
  },
  dayNavText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    paddingHorizontal: 8,
  },
  simpleEntryBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  boxLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  simpleTextInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    minHeight: 46,
  },
  horizontalChipsRow: {
    marginVertical: 8,
  },
  minimalChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  minimalChipActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  minimalChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  minimalChipTextActive: {
    color: "#059669",
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  dittoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 10,
  },
  dittoButtonText: {
    color: "#047857",
    fontWeight: "700",
    fontSize: 12,
  },
  saveButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  notebookCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  notebookHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  colHead: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  notebookRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    minHeight: 36,
    paddingHorizontal: 4,
  },
  colCell: {
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "600",
  },
  dayText: {
    fontSize: 11,
    color: "#0F172A",
    textAlign: "center",
    fontWeight: "700",
  },
  medText: {
    fontSize: 12,
    color: "#1E293B",
    lineHeight: 16,
  },
});
