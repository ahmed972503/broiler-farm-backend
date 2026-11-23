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
import { Button, Card, Badge, Input } from "../../src/components/ui";
import { apiFetch, API_BASE_URL } from "../../src/api/client";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { useTranslation } from "react-i18next";

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
  "ND-Killed",
  "Acidifier",
  "Colistin",
  "Neomycin",
  "Tylosin",
  "Enrofloxacin",
  "Liver Tonic",
];

export default function WorkerVaccinationsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();
  const { t } = useTranslation();

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
    // Find yesterday's entry
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
      // already present, don't duplicate
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
      // Update local state
      setEntries((prev) =>
        prev.map((e) =>
          e.day === selectedDay
            ? { ...e, detail: medicineInput.trim(), isDitto: medicineInput.includes('"') }
            : e,
        ),
      );

      // Save via offline store
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
        "Teeka Lag Gaya! (Success)",
        `${task.vaccineName} marked as completed.`,
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update task");
    }
  };

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
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* Screen Title */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="pill"
              size={24}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontSize: typography.sizes.lg,
                  fontWeight: typography.weights.bold,
                },
              ]}
            >
              💊 Dawaai Register (Medicine Log)
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.xs,
              marginTop: 2,
            }}
          >
            Notebook Register (Photo 2) • Tareekh, Din aur Dawaai ka Khata
          </Text>
        </View>

        {/* Tab switch between Register and Task alerts */}
        <View style={styles.topTabs}>
          <TouchableOpacity
            onPress={() => setActiveTab("register")}
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === "register" ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: activeTab === "register" ? "#fff" : colors.text,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              📖 Dawaai Khata
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("tasks")}
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === "tasks" ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: activeTab === "tasks" ? "#fff" : colors.text,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              💉 Teekay Tasks ({tasks.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "register" ? (
        <>
          {/* ========================================================================= */}
          {/* FAST MEDICINE ENTRY CARD WITH "DITTO" COPY BUTTON AND ONE-TAP CHIPS */}
          {/* ========================================================================= */}
          <View
            style={[
              styles.entryBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <View style={styles.entryHeaderRow}>
              <View>
                <Text
                  style={{
                    fontSize: typography.sizes.base,
                    fontWeight: typography.weights.bold,
                    color: colors.primary,
                  }}
                >
                  ✏️ Aaj Ki Dawaai Likhein (Day {selectedDay})
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Chip daba kar dawaai shamil karein ya Pichle Din Jaisi button dabayein
                </Text>
              </View>

              {/* Day Selector Pill */}
              <View style={styles.dayPickerPill}>
                <TouchableOpacity
                  onPress={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                  style={styles.dayStepperBtn}
                >
                  <Ionicons name="chevron-back" size={16} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.dayPickerText}>Day {selectedDay}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedDay(Math.min(45, selectedDay + 1))}
                  style={styles.dayStepperBtn}
                >
                  <Ionicons name="chevron-forward" size={16} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* DITTO COPY BUTTON (THE GOLDEN PAPER-LIKE SHORTCUT) */}
            <TouchableOpacity
              onPress={handleDittoCopy}
              style={[
                styles.dittoButton,
                { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
              ]}
            >
              <MaterialCommunityIcons
                name="content-copy"
                size={20}
                color="#B45309"
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#92400E",
                    fontWeight: "800",
                    fontSize: 13,
                  }}
                >
                  " " " " (Pichle Din Jaisi / Ditto)
                </Text>
                <Text style={{ color: "#B45309", fontSize: 11 }}>
                  1-Click: Kal wali dawaai aaj ke liye copy karein
                </Text>
              </View>
            </TouchableOpacity>

            {/* Quick Add Medicine Chips */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: colors.textSecondary,
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              ⚡ Fast Chips (Dawaai Ka Naam Shamil Karein):
            </Text>
            <View style={styles.chipsContainer}>
              {COMMON_MEDICINE_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  onPress={() => handleAddChip(chip)}
                  style={[
                    styles.medicineChip,
                    {
                      backgroundColor: medicineInput.includes(chip)
                        ? colors.primaryBg
                        : colors.surface,
                      borderColor: medicineInput.includes(chip)
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: medicineInput.includes(chip)
                        ? colors.primary
                        : colors.text,
                    }}
                  >
                    + {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Free-Text Input */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>
                Dawaai Ki Tafseel (Medicine Used Detail):
              </Text>
              <TextInput
                value={medicineInput}
                onChangeText={setMedicineInput}
                placeholder="e.g. Captent + I.B + Biozyme + Growvite"
                multiline
                numberOfLines={2}
                style={[
                  styles.medicineTextInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            {/* Save Button */}
            <View style={{ marginTop: 10 }}>
              <Button
                title={
                  submitting
                    ? "Mehfooz Ho Raha Hai..."
                    : "📋 Dawaai Register Mein Darj Karein"
                }
                onPress={handleSaveMedicine}
                loading={submitting}
                size="md"
              />
            </View>
          </View>

          {/* ========================================================================= */}
          {/* DIGITAL DAWAAI REGISTER TABLE (MATCHING PHOTO 2 HANDWRITTEN NOTEBOOK) */}
          {/* ========================================================================= */}
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeaderBanner}>
              <View>
                <Text
                  style={[
                    styles.sheetTitle,
                    { color: colors.text, fontSize: typography.sizes.md },
                  ]}
                >
                  📖 Dawaai Register (Notebook View)
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  Photo 2 jesa 2-column paper register • Days 1 to 45
                </Text>
              </View>
              <Badge label="Days 1 - 45" variant="neutral" size="sm" />
            </View>

            <View
              style={[
                styles.tableBorderWrapper,
                { borderColor: colors.border, backgroundColor: "#FFFFFF" },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.tableHeaderRow,
                  { backgroundColor: "#1E293B" },
                ]}
              >
                <View style={[styles.cellHeader, { width: 75 }]}>
                  <Text style={styles.headerTextLight}>DATE</Text>
                </View>
                <View style={[styles.cellHeader, { width: 50 }]}>
                  <Text style={styles.headerTextLight}>DAY</Text>
                </View>
                <View style={[styles.cellHeader, { flex: 1 }]}>
                  <Text style={[styles.headerTextLight, { textAlign: "left" }]}>
                    MEDICINE USED (DETAIL)
                  </Text>
                </View>
              </View>

              {/* Rows */}
              {entries.map((item, idx) => {
                const isSelected = item.day === selectedDay;
                const rowBg = isSelected
                  ? "#ECFDF5"
                  : idx % 2 === 0
                    ? "#FFFFFF"
                    : "#F8FAFC";

                return (
                  <TouchableOpacity
                    key={item.day}
                    onPress={() => {
                      setSelectedDay(item.day);
                      setMedicineInput(item.detail);
                    }}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: rowBg,
                        borderBottomColor: "#E2E8F0",
                      },
                    ]}
                  >
                    <View style={[styles.cell, { width: 75 }]}>
                      <Text
                        style={[
                          styles.cellTextBold,
                          { color: isSelected ? "#059669" : "#334155" },
                        ]}
                      >
                        {item.date}
                      </Text>
                    </View>
                    <View style={[styles.cell, { width: 50 }]}>
                      <Text
                        style={[
                          styles.cellTextBold,
                          { color: isSelected ? "#059669" : "#0F172A" },
                        ]}
                      >
                        {item.day}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.cell,
                        {
                          flex: 1,
                          alignItems: "flex-start",
                          paddingHorizontal: 8,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellMedicineText,
                          {
                            color: item.isDitto ? "#B45309" : "#0F172A",
                            fontStyle: item.isDitto ? "italic" : "normal",
                            fontWeight: item.isDitto ? "700" : "500",
                          },
                        ]}
                      >
                        {item.detail}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      ) : (
        /* Tasks Tab (Vaccination tasks fallback) */
        <View style={{ marginTop: 10 }}>
          {tasks.length === 0 ? (
            <Card style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary }}>
                Koi pending teeka task nahi hai.
              </Text>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={task._id}
                style={{
                  marginBottom: 10,
                  borderColor:
                    task.status === "completed" ? colors.success : colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {task.vaccineName} ({task.route})
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      Due Date: {task.dueDate} • Shed {task.shedNumber || 1}
                    </Text>
                  </View>
                  {task.status === "completed" ? (
                    <Badge label="COMPLETED" variant="success" size="sm" />
                  ) : (
                    <Button
                      title="Teeka Lag Gaya"
                      size="sm"
                      onPress={() => handleMarkComplete(task)}
                    />
                  )}
                </View>
              </Card>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  title: {},
  topTabs: {
    flexDirection: "row",
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  entryBox: {
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dayPickerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  dayStepperBtn: {
    padding: 4,
  },
  dayPickerText: {
    fontWeight: "800",
    fontSize: 12,
    paddingHorizontal: 6,
    color: "#0F172A",
  },
  dittoButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  medicineChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  medicineTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    fontSize: 13,
    minHeight: 48,
  },
  sheetContainer: {
    marginTop: 6,
  },
  sheetHeaderBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    fontWeight: "800",
  },
  tableBorderWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cellHeader: {
    padding: 8,
    borderRightWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextLight: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    minHeight: 36,
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  cellTextBold: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  cellMedicineText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
