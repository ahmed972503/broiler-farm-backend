import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Linking,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { API_BASE_URL } from "../../src/api/client";

// =========================================================================
// TYPES
// =========================================================================
interface FeedEntry {
  id: string;
  date: string;
  dayNumber: number;
  timeRange: string;
  targetFlock: string;
  receivedBags: number;
  usedBags: number;
  remainingBags: number;
}

interface ChoozaEntry {
  id: string;
  date: string;
  dayNumber: number;
  chicksPlaced: number;
  mortDay: number;
  mortNight: number;
  totalMort24h: number;
  deathReason: string;
  remainingBirds: number;
}

interface MedicalGuideItem {
  id: string;
  diseaseName: string;
  doctorName: string;
  doctorPhone: string;
  medicineSolution: string;
  instructions: string;
}

// Initial Sample Data matching actual farm history from notebook registers
const INITIAL_FEED_LOG: FeedEntry[] = [
  {
    id: "f-1",
    date: "23-Nov-2026",
    dayNumber: 28,
    timeRange: "08:00 AM - 02:00 PM",
    targetFlock: "Shed 1 (Cobb 500)",
    receivedBags: 200,
    usedBags: 25,
    remainingBags: 175,
  },
  {
    id: "f-2",
    date: "22-Nov-2026",
    dayNumber: 27,
    timeRange: "02:00 PM - 09:00 PM",
    targetFlock: "Shed 1 (Cobb 500)",
    receivedBags: 200,
    usedBags: 23,
    remainingBags: 177,
  },
  {
    id: "f-3",
    date: "21-Nov-2026",
    dayNumber: 26,
    timeRange: "08:00 AM - 08:00 PM",
    targetFlock: "Shed 1 (Cobb 500)",
    receivedBags: 200,
    usedBags: 22,
    remainingBags: 178,
  },
  {
    id: "f-4",
    date: "20-Nov-2026",
    dayNumber: 25,
    timeRange: "08:00 AM - 02:00 PM",
    targetFlock: "Shed 1 (Cobb 500)",
    receivedBags: 200,
    usedBags: 20,
    remainingBags: 180,
  },
];

const INITIAL_CHOOZA_LOG: ChoozaEntry[] = [
  {
    id: "c-1",
    date: "23-Nov-2026",
    dayNumber: 28,
    chicksPlaced: 19888,
    mortDay: 54,
    mortNight: 78,
    totalMort24h: 132,
    deathReason: "Garmi Ka Tanav (Heat Stress)",
    remainingBirds: 19135,
  },
  {
    id: "c-2",
    date: "22-Nov-2026",
    dayNumber: 27,
    chicksPlaced: 19888,
    mortDay: 45,
    mortNight: 72,
    totalMort24h: 117,
    deathReason: "Kamzori / Saans Ka Masla",
    remainingBirds: 19267,
  },
  {
    id: "c-3",
    date: "21-Nov-2026",
    dayNumber: 26,
    chicksPlaced: 19888,
    mortDay: 36,
    mortNight: 36,
    totalMort24h: 72,
    deathReason: "Kamzori",
    remainingBirds: 19384,
  },
  {
    id: "c-4",
    date: "20-Nov-2026",
    dayNumber: 25,
    chicksPlaced: 19888,
    mortDay: 22,
    mortNight: 20,
    totalMort24h: 42,
    deathReason: "Normal",
    remainingBirds: 19456,
  },
];

const INITIAL_MEDICAL_GUIDE: MedicalGuideItem[] = [
  {
    id: "m-1",
    diseaseName: "CRD / Saans Ka Kharr Kharr",
    doctorName: "Dr. Ahsan (Poultry Specialist)",
    doctorPhone: "0300-5551234",
    medicineSolution: "Ventilin + Mucolator + Respifine + Tyloce",
    instructions: "Subah ke taza paani mein 200 Liters, 4 din musalsal chalayein.",
  },
  {
    id: "m-2",
    diseaseName: "E.Coli / Safaid Pikhana",
    doctorName: "Dr. Tariq (Veterinary Consultant)",
    doctorPhone: "0301-8884321",
    medicineSolution: "Colistin Sulphate + Amoxycillin 20%",
    instructions: "Dopehar ke paani mein 1 gram per Liter, 3 din tak dein.",
  },
  {
    id: "m-3",
    diseaseName: "Garmi Ka Tanav / Heat Stress",
    doctorName: "Dr. Ahsan (Poultry Specialist)",
    doctorPhone: "0300-5551234",
    medicineSolution: "Electrolytes + Vitamin C + Glucose (Sharbat)",
    instructions: "Subah 11:00 AM se Sham 05:00 PM thanday taza paani mein dein.",
  },
  {
    id: "m-4",
    diseaseName: "Hazmay Ka Masla / Badhazmi",
    doctorName: "Dr. Tariq (Veterinary Consultant)",
    doctorPhone: "0301-8884321",
    medicineSolution: "Acidifier + Biozyme + Liver Tonic",
    instructions: "Sham ke paani mein 1ml per 2 Liter paani mein shamil karein.",
  },
];

// -------------------------------------------------------------------------
// DATE & TIME FORMATTING HELPERS
// -------------------------------------------------------------------------
function isoToFormattedDate(iso: string): string {
  if (!iso) return "23-Nov-2026";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mIndex = parseInt(parts[1], 10) - 1;
  const month = months[mIndex] || parts[1];
  return `${parts[2]}-${month}-${parts[0]}`;
}

function time24To12(time24: string): string {
  if (!time24) return "08:00 AM";
  const parts = time24.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  const hStr = h < 10 ? `0${h}` : `${h}`;
  return `${hStr}:${m} ${ampm}`;
}

// -------------------------------------------------------------------------
// DATE SELECTOR COMPONENT (SELECTION INSTEAD OF MANUAL TYPING)
// -------------------------------------------------------------------------
function DateSelector({
  label,
  isoValue,
  onSelectDate,
  containerStyle,
}: {
  label: string;
  isoValue: string;
  onSelectDate: (iso: string, formatted: string) => void;
  containerStyle?: any;
}) {
  const quickDates = [
    { label: "Aaj (Today)", iso: "2026-11-23", formatted: "23-Nov-2026" },
    { label: "Kal (Yesterday)", iso: "2026-11-22", formatted: "22-Nov-2026" },
    { label: "21-Nov", iso: "2026-11-21", formatted: "21-Nov-2026" },
  ];

  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      <Text style={styles.fieldLabelText}>{label}</Text>
      <View style={styles.blackInputBox}>
        <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
          <Ionicons name="calendar" size={18} color="#059669" style={{ marginRight: 8 }} />
          <TextInput
            value={isoValue}
            onChangeText={(val) => {
              const formatted = isoToFormattedDate(val);
              onSelectDate(val, formatted);
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748B"
            style={styles.pickerInputText}
            {...(Platform.OS === "web"
              ? ({
                type: "date",
              } as any)
              : {})}
          />
        </View>
      </View>
      <View style={styles.chipRow}>
        {quickDates.map((q) => {
          const isSelected = isoValue === q.iso;
          return (
            <TouchableOpacity
              key={q.iso}
              onPress={() => onSelectDate(q.iso, q.formatted)}
              style={[
                styles.quickChip,
                isSelected && styles.quickChipActiveGreen,
              ]}
            >
              <Text
                style={[
                  styles.quickChipText,
                  isSelected && styles.quickChipTextActive,
                ]}
              >
                {q.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// -------------------------------------------------------------------------
// TIME RANGE SELECTOR (SELECTION INSTEAD OF MANUAL TYPING)
// -------------------------------------------------------------------------
function TimeRangeSelector({
  start24,
  end24,
  start12,
  end12,
  onSelectTimes,
}: {
  start24: string;
  end24: string;
  start12: string;
  end12: string;
  onSelectTimes: (s24: string, e24: string, s12: string, e12: string) => void;
}) {
  const shifts = [
    {
      title: "Subah Shift",
      desc: "08:00 AM - 02:00 PM",
      s24: "08:00",
      e24: "14:00",
      s12: "08:00 AM",
      e12: "02:00 PM",
    },
    {
      title: "Dopehar Shift",
      desc: "02:00 PM - 09:00 PM",
      s24: "14:00",
      e24: "21:00",
      s12: "02:00 PM",
      e12: "09:00 PM",
    },
    {
      title: "Raat Shift",
      desc: "09:00 PM - 08:00 AM",
      s24: "21:00",
      e24: "08:00",
      s12: "09:00 PM",
      e12: "08:00 AM",
    },
    {
      title: "Full 24h",
      desc: "Poora Din",
      s24: "08:00",
      e24: "08:00",
      s12: "08:00 AM",
      e12: "08:00 AM",
    },
  ];

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabelText}>Waqt Selection (Time Window - Minute-to-Minute):</Text>

      {/* 1-Tap Shift Presets */}
      <View style={[styles.chipRow, { marginBottom: 10 }]}>
        {shifts.map((s) => {
          const isSelected = start12 === s.s12 && end12 === s.e12;
          return (
            <TouchableOpacity
              key={s.title}
              onPress={() => onSelectTimes(s.s24, s.e24, s.s12, s.e12)}
              style={[
                styles.shiftPresetChip,
                isSelected && styles.shiftPresetChipActive,
              ]}
            >
              <Text
                style={[
                  styles.shiftPresetTitle,
                  isSelected && styles.shiftPresetTitleActive,
                ]}
              >
                {s.title}
              </Text>
              <Text
                style={[
                  styles.shiftPresetDesc,
                  isSelected && styles.shiftPresetDescActive,
                ]}
              >
                {s.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Start Time & End Time Pickers */}
      <View style={styles.formRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.fieldLabelText, { fontSize: 10 }]}>SHURU WAQT (START TIME)</Text>
          <View style={styles.blackInputBox}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <Ionicons name="time" size={18} color="#2563EB" style={{ marginRight: 8 }} />
              <TextInput
                value={start24}
                onChangeText={(val) => {
                  const s12 = time24To12(val);
                  onSelectTimes(val, end24, s12, end12);
                }}
                placeholder="08:00"
                placeholderTextColor="#64748B"
                style={styles.pickerInputText}
                {...(Platform.OS === "web"
                  ? ({
                    type: "time",
                  } as any)
                  : {})}
              />
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabelText, { fontSize: 10 }]}>KHATAM WAQT (END TIME)</Text>
          <View style={styles.blackInputBox}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <Ionicons name="time" size={18} color="#2563EB" style={{ marginRight: 8 }} />
              <TextInput
                value={end24}
                onChangeText={(val) => {
                  const e12 = time24To12(val);
                  onSelectTimes(start24, val, start12, e12);
                }}
                placeholder="14:00"
                placeholderTextColor="#64748B"
                style={styles.pickerInputText}
                {...(Platform.OS === "web"
                  ? ({
                    type: "time",
                  } as any)
                  : {})}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// FormField with 100% Guaranteed 2px Solid Black Border Box & Distinct Header Label
function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  containerStyle,
  textColor = "#000000",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "numeric" | "phone-pad";
  containerStyle?: any;
  textColor?: string;
}) {
  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      <Text style={styles.fieldLabelText}>{label}</Text>
      <View style={styles.blackInputBox}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          keyboardType={keyboardType}
          style={[styles.innerTextInput, { color: textColor }]}
        />
      </View>
    </View>
  );
}

export default function UserDashboardScreen() {
  const { colors, spacing } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();

  const [activeTab, setActiveTab] = useState<"feed" | "chooza" | "doctor">("feed");
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------------------------------------------------
  // 1. DATA STATE
  // -------------------------------------------------------------------------
  const [feedLog, setFeedLog] = useState<FeedEntry[]>(INITIAL_FEED_LOG);
  const [choozaLog, setChoozaLog] = useState<ChoozaEntry[]>(INITIAL_CHOOZA_LOG);
  const [medicalList, setMedicalList] = useState<MedicalGuideItem[]>(INITIAL_MEDICAL_GUIDE);
  const [searchDiseaseQuery, setSearchDiseaseQuery] = useState("");

  // -------------------------------------------------------------------------
  // 2. MODAL STATES (For Clean, Fast Data Entry)
  // -------------------------------------------------------------------------
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showChoozaModal, setShowChoozaModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  // Feed Modal Form Inputs
  const [feedDateISO, setFeedDateISO] = useState("2026-11-23");
  const [feedDate, setFeedDate] = useState("23-Nov-2026");
  const [feedDay, setFeedDay] = useState("28");
  const [feedTimeStartISO, setFeedTimeStartISO] = useState("08:00");
  const [feedTimeEndISO, setFeedTimeEndISO] = useState("14:00");
  const [feedTimeStart, setFeedTimeStart] = useState("08:00 AM");
  const [feedTimeEnd, setFeedTimeEnd] = useState("02:00 PM");
  const [feedTarget, setFeedTarget] = useState("Shed 1 (Cobb 500)");
  const [feedReceived, setFeedReceived] = useState("200");
  const [feedUsed, setFeedUsed] = useState("25");

  // Chooza Modal Form Inputs
  const [choozaDateISO, setChoozaDateISO] = useState("2026-11-23");
  const [choozaDate, setChoozaDate] = useState("23-Nov-2026");
  const [choozaDay, setChoozaDay] = useState("28");
  const [choozaTotalPlaced, setChoozaTotalPlaced] = useState("19888");
  const [choozaMortDay, setChoozaMortDay] = useState("54");
  const [choozaMortNight, setChoozaMortNight] = useState("78");
  const [choozaDeathReason, setChoozaDeathReason] = useState("Garmi Ka Tanav (Heat Stress)");

  // Doctor Modal Form Inputs
  const [guideDoctorName, setGuideDoctorName] = useState("");
  const [guideDoctorPhone, setGuideDoctorPhone] = useState("");
  const [guideDiseaseName, setGuideDiseaseName] = useState("");
  const [guideSolution, setGuideSolution] = useState("");
  const [guideInstructions, setGuideInstructions] = useState("");

  // Live Auto-Calculations for Modals
  const numReceivedFeed = parseFloat(feedReceived) || 0;
  const numUsedFeed = parseFloat(feedUsed) || 0;
  const numRemainingFeed = Math.max(0, numReceivedFeed - numUsedFeed);

  const numTotalChicks = parseInt(choozaTotalPlaced, 10) || 19888;
  const numMortDay = parseInt(choozaMortDay, 10) || 0;
  const numMortNight = parseInt(choozaMortNight, 10) || 0;
  const totalDailyMort = numMortDay + numMortNight;

  const previousRemaining = choozaLog[0]?.remainingBirds || numTotalChicks;
  const modalRemainingBirds = Math.max(0, previousRemaining - totalDailyMort);

  // Aggregate Totals for Table Summaries
  const totalFeedUsedAll = feedLog.reduce((acc, item) => acc + item.usedBags, 0);
  const currentFeedStock = feedLog[0]?.remainingBags || 175;
  const currentLiveBirds = choozaLog[0]?.remainingBirds || 19135;
  const totalMortalityAll = choozaLog.reduce((acc, item) => acc + item.totalMort24h, 0);

  // -------------------------------------------------------------------------
  // SAVE HANDLERS
  // -------------------------------------------------------------------------
  const handleSaveFeed = async () => {
    if (!feedUsed || numUsedFeed <= 0) {
      Alert.alert("Ghalti", "Baraye meherbani istemaal shuda borian (Used Bags) darj karein.");
      return;
    }

    const newEntry: FeedEntry = {
      id: `f-${Date.now()}`,
      date: feedDate.trim() || new Date().toISOString().split("T")[0],
      dayNumber: parseInt(feedDay, 10) || 1,
      timeRange: `${feedTimeStart} - ${feedTimeEnd}`,
      targetFlock: feedTarget,
      receivedBags: numReceivedFeed,
      usedBags: numUsedFeed,
      remainingBags: numRemainingFeed,
    };

    setFeedLog([newEntry, ...feedLog]);
    setShowFeedModal(false);

    try {
      await OfflineStore.enqueueMutation("FEED_ISSUE", "CREATE", {
        type: "usage",
        date: feedDate,
        dayNumber: feedDay,
        timeRange: newEntry.timeRange,
        target: feedTarget,
        usedBags: numUsedFeed,
        remainingBags: numRemainingFeed,
      });

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn("Background sync error", e),
        );
      }
    } catch {
      // offline fallback
    }

    Alert.alert(
      "Feed Entry Table Mein Shamil Ho Gayi!",
      `Day ${newEntry.dayNumber} • ${newEntry.usedBags} Bori Istemaal • Baqi Stock: ${newEntry.remainingBags} Bags.`,
    );
  };

  const handleSaveChooza = async () => {
    const newEntry: ChoozaEntry = {
      id: `c-${Date.now()}`,
      date: choozaDate.trim() || new Date().toISOString().split("T")[0],
      dayNumber: parseInt(choozaDay, 10) || 1,
      chicksPlaced: numTotalChicks,
      mortDay: numMortDay,
      mortNight: numMortNight,
      totalMort24h: totalDailyMort,
      deathReason: choozaDeathReason.trim() || "Normal",
      remainingBirds: modalRemainingBirds,
    };

    setChoozaLog([newEntry, ...choozaLog]);
    setShowChoozaModal(false);

    try {
      await OfflineStore.enqueueMutation("DAILY_RECORD", "CREATE", {
        date: choozaDate,
        ageInDays: parseInt(choozaDay, 10) || 1,
        mortalityDayShift: numMortDay,
        mortalityNightShift: numMortNight,
        mortalityCount: totalDailyMort,
        deathReason: choozaDeathReason,
        remainingBirds: modalRemainingBirds,
      });

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch((e) =>
          console.warn("Background sync error", e),
        );
      }
    } catch {
      // offline fallback
    }

    Alert.alert(
      "Chooza Entry Table Mein Shamil Ho Gayi!",
      `Day ${newEntry.dayNumber} • 24h Amwaat: ${totalDailyMort} • Baqi Zinda Chooza: ${modalRemainingBirds.toLocaleString()}.`,
    );
  };

  const handleSaveMedicalGuide = () => {
    if (!guideDiseaseName.trim() || !guideSolution.trim() || !guideDoctorName.trim()) {
      Alert.alert("Tafseel Likhein", "Doctor ka naam, bimari aur dawaai ka solution likhna zaroori hai.");
      return;
    }

    const newGuide: MedicalGuideItem = {
      id: `med-${Date.now()}`,
      diseaseName: guideDiseaseName.trim(),
      doctorName: guideDoctorName.trim(),
      doctorPhone: guideDoctorPhone.trim() || "0300-1234567",
      medicineSolution: guideSolution.trim(),
      instructions: guideInstructions.trim() || "Doctor ki hidayat ke mutabiq chalayein.",
    };

    setMedicalList([newGuide, ...medicalList]);
    setShowDoctorModal(false);
    setGuideDiseaseName("");
    setGuideSolution("");
    setGuideInstructions("");
    setGuideDoctorName("");
    setGuideDoctorPhone("");

    Alert.alert("Guide Shamil Ho Gaya!", `${newGuide.diseaseName} ka ilaj table mein shamil ho gaya hai.`);
  };

  const handleDeleteFeedRow = (id: string) => {
    Alert.alert("Entry Delete Karein?", "Kya aap waqai is entry ko table se hatana chahtay hain?", [
      { text: "Nahi", style: "cancel" },
      {
        text: "Haan, Delete",
        style: "destructive",
        onPress: () => setFeedLog(feedLog.filter((item) => item.id !== id)),
      },
    ]);
  };

  const handleDeleteChoozaRow = (id: string) => {
    Alert.alert("Entry Delete Karein?", "Kya aap waqai is chooza entry ko table se hatana chahtay hain?", [
      { text: "Nahi", style: "cancel" },
      {
        text: "Haan, Delete",
        style: "destructive",
        onPress: () => setChoozaLog(choozaLog.filter((item) => item.id !== id)),
      },
    ]);
  };

  const handleDeleteDoctorRow = (id: string) => {
    Alert.alert("Record Delete Karein?", "Kya aap waqai is bimari guide ko hatana chahtay hain?", [
      { text: "Nahi", style: "cancel" },
      {
        text: "Haan, Delete",
        style: "destructive",
        onPress: () => setMedicalList(medicalList.filter((item) => item.id !== id)),
      },
    ]);
  };

  const handleCallDoctor = (phone: string, doctorName: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    if (!cleanPhone) {
      Alert.alert("Number Maujood Nahi", "Doctor ka phone number darj nahi hai.");
      return;
    }

    Alert.alert(
      "Doctor Ko Call Milayein",
      `Kya aap ${doctorName} ko (${phone}) par call milana chahtay hain?`,
      [
        { text: "Nahi (Cancel)", style: "cancel" },
        {
          text: "Haan (Call Now)",
          onPress: () => {
            Linking.openURL(`tel:${cleanPhone}`).catch(() => {
              Alert.alert("Error", "Phone call dialer open nahi ho saka.");
            });
          },
        },
      ],
    );
  };

  // -------------------------------------------------------------------------
  // PRINTABLE PROFESSIONAL PDF GENERATOR
  // -------------------------------------------------------------------------
  const handleExportPDF = (type: "feed" | "chooza" | "full") => {
    let reportTitle = "";
    let tableHtml = "";

    if (type === "feed") {
      reportTitle = "Al-Barakah Broiler Farm • Rozana Feed Calculation Table Register";
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:center; font-family:Arial, sans-serif; font-size:12px;">
          <thead>
            <tr style="background-color:#065F46; color:#ffffff;">
              <th>#</th>
              <th>Tareekh & Saal</th>
              <th>Din (Day)</th>
              <th>Waqt (Start - End)</th>
              <th>Flock / Shed</th>
              <th>Feed Aayi (Stock In)</th>
              <th>Istemaal (Used Bags)</th>
              <th>Baqi Stock (Balance)</th>
            </tr>
          </thead>
          <tbody>
            ${feedLog
          .map(
            (f, idx) => `
              <tr style="background-color:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                <td>${idx + 1}</td>
                <td><strong>${f.date}</strong></td>
                <td>Day ${f.dayNumber}</td>
                <td>${f.timeRange}</td>
                <td>${f.targetFlock}</td>
                <td>${f.receivedBags} Bags (${f.receivedBags * 50} kg)</td>
                <td style="color:#dc2626; font-weight:bold;">${f.usedBags} Bags</td>
                <td style="color:#059669; font-weight:bold;">${f.remainingBags} Bags</td>
              </tr>`,
          )
          .join("")}
          </tbody>
          <tfoot>
            <tr style="background-color:#e2e8f0; font-weight:bold;">
              <td colspan="5" style="text-align:right;">KUL HISAB (TOTALS):</td>
              <td>${feedLog[0]?.receivedBags || 200} Bags In</td>
              <td style="color:#dc2626;">${totalFeedUsedAll} Bags Used</td>
              <td style="color:#059669;">${currentFeedStock} Bags Baqi</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (type === "chooza") {
      reportTitle = "Al-Barakah Broiler Farm • Chooza & Mortality Table Register";
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:center; font-family:Arial, sans-serif; font-size:12px;">
          <thead>
            <tr style="background-color:#0F172A; color:#ffffff;">
              <th>#</th>
              <th>Tareekh & Saal</th>
              <th>Din (Day)</th>
              <th>Kul Shamil (Total Placed)</th>
              <th>Din Amwaat (Day)</th>
              <th>Sham Amwaat (Night)</th>
              <th>24h Kul Amwaat</th>
              <th>Maut Ki Wajah (Reason)</th>
              <th>Baqi Zinda Chooza</th>
            </tr>
          </thead>
          <tbody>
            ${choozaLog
          .map(
            (c, idx) => `
              <tr style="background-color:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                <td>${idx + 1}</td>
                <td><strong>${c.date}</strong></td>
                <td>Day ${c.dayNumber}</td>
                <td>${c.chicksPlaced.toLocaleString()}</td>
                <td style="color:#dc2626;">${c.mortDay}</td>
                <td style="color:#dc2626;">${c.mortNight}</td>
                <td style="color:#b91c1c; font-weight:bold;">${c.totalMort24h}</td>
                <td>${c.deathReason}</td>
                <td style="color:#059669; font-weight:bold;">${c.remainingBirds.toLocaleString()}</td>
              </tr>`,
          )
          .join("")}
          </tbody>
          <tfoot>
            <tr style="background-color:#e2e8f0; font-weight:bold;">
              <td colspan="4" style="text-align:right;">KUL AMWAAT SUMMARY:</td>
              <td colspan="3" style="color:#b91c1c;">Kul Amwaat: ${totalMortalityAll} Chooza</td>
              <td colspan="2" style="color:#059669;">Baqi Zinda: ${currentLiveBirds.toLocaleString()} Birds</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      reportTitle = "Al-Barakah Broiler Farm • Mukammal Rozana Working Report (Feed + Chooza + Medical)";
      tableHtml = `
        <h3 style="color:#065F46; border-bottom:2px solid #065F46; padding-bottom:4px;">1. Feed Calculation Table</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:center; font-size:11px; margin-bottom:20px;">
          <tr style="background-color:#065F46; color:#fff;"><th>Tareekh</th><th>Din</th><th>Waqt</th><th>Shed</th><th>Aayi Feed</th><th>Istemaal</th><th>Baqi Stock</th></tr>
          ${feedLog.map((f) => `<tr><td>${f.date}</td><td>Day ${f.dayNumber}</td><td>${f.timeRange}</td><td>${f.targetFlock}</td><td>${f.receivedBags} Bags</td><td style="color:#dc2626; font-weight:bold;">${f.usedBags}</td><td style="color:#059669; font-weight:bold;">${f.remainingBags}</td></tr>`).join("")}
        </table>

        <h3 style="color:#0F172A; border-bottom:2px solid #0F172A; padding-bottom:4px;">2. Chooza & Mortality Table</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:center; font-size:11px; margin-bottom:20px;">
          <tr style="background-color:#0F172A; color:#fff;"><th>Tareekh</th><th>Din</th><th>Kul Chooza</th><th>Din Maut</th><th>Sham Maut</th><th>24h Total</th><th>Wajah</th><th>Zinda Chooza</th></tr>
          ${choozaLog.map((c) => `<tr><td>${c.date}</td><td>Day ${c.dayNumber}</td><td>${c.chicksPlaced}</td><td>${c.mortDay}</td><td>${c.mortNight}</td><td style="color:#b91c1c; font-weight:bold;">${c.totalMort24h}</td><td>${c.deathReason}</td><td style="color:#059669; font-weight:bold;">${c.remainingBirds.toLocaleString()}</td></tr>`).join("")}
        </table>

        <h3 style="color:#7C3AED; border-bottom:2px solid #7C3AED; padding-bottom:4px;">3. Doctor & Tibbi Directory</h3>
        <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:left; font-size:11px;">
          <tr style="background-color:#7C3AED; color:#fff;"><th>Bimari</th><th>Tajweez Karda Dawaai</th><th>Tareeqa-e-Istemal</th><th>Doctor</th><th>Rabta</th></tr>
          ${medicalList.map((m) => `<tr><td><strong>${m.diseaseName}</strong></td><td>${m.medicineSolution}</td><td>${m.instructions}</td><td>${m.doctorName}</td><td>${m.doctorPhone}</td></tr>`).join("")}
        </table>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 25px; color: #1e293b; }
            .header { text-align: center; border-bottom: 3px double #065f46; padding-bottom: 12px; margin-bottom: 20px; }
            .farm-name { font-size: 22px; font-weight: 900; color: #065f46; text-transform: uppercase; margin: 0; }
            .meta { font-size: 13px; color: #475569; margin-top: 6px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="farm-name">Al-Barakah Broiler Farm</h1>
            <div class="meta">
              <strong>Official Daily Farm Register Report</strong> • Batch: Cobb 500 • Shed 1 • Day 28<br/>
              Printed on: ${new Date().toLocaleString()} • Worker: ${user?.name || "Ali Ahmed"}
            </div>
          </div>
          ${tableHtml}
        </body>
      </html>
    `;

    if (Platform.OS === "web") {
      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(fullHtml);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 300);
      }
    } else {
      Alert.alert(
        "PDF Report Tayyar Hai!",
        `${reportTitle}\n\nTamam table data register print aur PDF export ke liye ready hai.`,
      );
    }
  };

  const filteredMedicalList = medicalList.filter(
    (item) =>
      item.diseaseName.toLowerCase().includes(searchDiseaseQuery.toLowerCase()) ||
      item.medicineSolution.toLowerCase().includes(searchDiseaseQuery.toLowerCase()) ||
      item.doctorName.toLowerCase().includes(searchDiseaseQuery.toLowerCase()),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F1F5F9" }}
      contentContainerStyle={[
        styles.container,
        {
          padding: spacing.base,
          maxWidth: 1200,
          alignSelf: "center",
          width: "100%",
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 500);
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL TOP HEADER & FARM SUMMARY */}
      {/* ========================================================================= */}
      <View style={styles.topHeaderCard}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name="home-analytics" size={24} color="#A7F3D0" />
            <Text style={styles.farmTitle}>AL-BARAKAH BROILER FARM</Text>
          </View>
          <Text style={styles.userRoleText}>
            Professional Farm Register & Dashboard • Worker: {user?.name || "Ali Ahmed"} (Shed 1)
          </Text>
        </View>

        <View style={styles.batchBadge}>
          <Text style={styles.batchBadgeText}>Batch: Cobb 500 • Day 28</Text>
        </View>
      </View>

      {/* 2. STATS & KPI BAR */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: "#059669" }]}>
          <Text style={styles.kpiLabel}>BAQI FEED STOCK</Text>
          <Text style={[styles.kpiValue, { color: "#065F46" }]}>
            {currentFeedStock} Bags
          </Text>
          <Text style={styles.kpiSub}>Available in Shed 1 ({currentFeedStock * 50} kg)</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
          <Text style={styles.kpiLabel}>ZINDA CHOOZA (LIVE)</Text>
          <Text style={[styles.kpiValue, { color: "#1E40AF" }]}>
            {currentLiveBirds.toLocaleString()}
          </Text>
          <Text style={styles.kpiSub}>Total Live Birds (Pl: 19,888)</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: "#D97706" }]}>
          <Text style={styles.kpiLabel}>DOCTOR ON CALL</Text>
          <Text style={[styles.kpiValue, { color: "#B45309", fontSize: 15 }]}>
            Dr. Ahsan
          </Text>
          <TouchableOpacity
            onPress={() => handleCallDoctor("0300-5551234", "Dr. Ahsan")}
            style={styles.quickCallPill}
          >
            <Ionicons name="call" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.quickCallText}>Direct Call (0300-5551234)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 3. PRO SEGMENTED TAB SWITCHER */}
      {/* ========================================================================= */}
      <View style={styles.segmentedNav}>
        <TouchableOpacity
          onPress={() => setActiveTab("feed")}
          style={[
            styles.segmentBtn,
            activeTab === "feed" && styles.segmentBtnActiveFeed,
          ]}
        >
          <MaterialCommunityIcons
            name="barley"
            size={18}
            color={activeTab === "feed" ? "#FFFFFF" : "#047857"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === "feed" && styles.segmentBtnTextActive,
            ]}
          >
            1. Feed Calculation Table
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("chooza")}
          style={[
            styles.segmentBtn,
            activeTab === "chooza" && styles.segmentBtnActiveChooza,
          ]}
        >
          <MaterialCommunityIcons
            name="bird"
            size={18}
            color={activeTab === "chooza" ? "#FFFFFF" : "#1E293B"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === "chooza" && styles.segmentBtnTextActive,
            ]}
          >
            2. Chooza Calculation Table
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("doctor")}
          style={[
            styles.segmentBtn,
            activeTab === "doctor" && styles.segmentBtnActiveDoctor,
          ]}
        >
          <MaterialCommunityIcons
            name="stethoscope"
            size={18}
            color={activeTab === "doctor" ? "#FFFFFF" : "#7C3AED"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === "doctor" && styles.segmentBtnTextActive,
            ]}
          >
            3. Doctor & Medical Table
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* TAB 1: FEED CALCULATION TABLE VIEW (HERO TABLE) */}
      {/* ========================================================================= */}
      {activeTab === "feed" && (
        <View style={styles.portionWrapper}>
          {/* Action Header Bar */}
          <View style={styles.tableToolbar}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.tableTitle}>Feed Calculation Register</Text>
                <View style={styles.recordBadgeGreen}>
                  <Text style={styles.recordBadgeTextGreen}>{feedLog.length} Entries</Text>
                </View>
              </View>
              <Text style={styles.tableSub}>
                Har din aur exact waqt (Minute-by-minute) ki feed bori aur stock hisab
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowFeedModal(true)}
                style={styles.actionBtnPrimaryGreen}
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnTextWhite}>+ Nayi Feed Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleExportPDF("feed")}
                style={styles.actionBtnOutline}
              >
                <Ionicons name="document-text-outline" size={15} color="#065F46" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnTextGreen}>Feed PDF</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SPREADSHEET REGISTER TABLE */}
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={{ minWidth: 920 }}>
                {/* Table Header */}
                <View style={styles.tableHeadFeed}>
                  <Text style={[styles.thCell, { width: 45 }]}>#</Text>
                  <Text style={[styles.thCell, { width: 115 }]}>TAREEKH (DATE)</Text>
                  <Text style={[styles.thCell, { width: 85 }]}>DIN (DAY)</Text>
                  <Text style={[styles.thCell, { width: 165 }]}>WAQT (FROM - TO)</Text>
                  <Text style={[styles.thCell, { width: 160, textAlign: "left", paddingLeft: 8 }]}>FLOCK / SHED</Text>
                  <Text style={[styles.thCell, { width: 120 }]}>FEED AAYI (IN)</Text>
                  <Text style={[styles.thCell, { width: 110 }]}>ISTEMAAL (USED)</Text>
                  <Text style={[styles.thCell, { width: 120 }]}>BAQI STOCK</Text>
                  <Text style={[styles.thCell, { width: 70 }]}>ACTION</Text>
                </View>

                {/* Table Rows */}
                {feedLog.map((row, index) => (
                  <View
                    key={row.id}
                    style={[
                      styles.tableRow,
                      { backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F8FAFC" },
                    ]}
                  >
                    <Text style={[styles.tdCell, { width: 45, color: "#64748B", fontWeight: "600" }]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.tdCell, { width: 115, fontWeight: "700" }]}>
                      {row.date}
                    </Text>
                    <View style={{ width: 85, alignItems: "center" }}>
                      <View style={styles.dayPill}>
                        <Text style={styles.dayPillText}>Day {row.dayNumber}</Text>
                      </View>
                    </View>
                    <View style={{ width: 165, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="time-outline" size={12} color="#2563EB" style={{ marginRight: 4 }} />
                      <Text style={[styles.tdCell, { color: "#2563EB", fontWeight: "600" }]}>
                        {row.timeRange}
                      </Text>
                    </View>
                    <Text style={[styles.tdCell, { width: 160, textAlign: "left", paddingLeft: 8 }]}>
                      {row.targetFlock}
                    </Text>
                    <Text style={[styles.tdCell, { width: 120, fontWeight: "600" }]}>
                      {row.receivedBags} Bags
                    </Text>
                    <View style={{ width: 110, alignItems: "center" }}>
                      <View style={styles.usedBadge}>
                        <Text style={styles.usedBadgeText}>-{row.usedBags} Bags</Text>
                      </View>
                    </View>
                    <View style={{ width: 120, alignItems: "center" }}>
                      <View style={styles.balanceBadge}>
                        <Text style={styles.balanceBadgeText}>{row.remainingBags} Bags</Text>
                      </View>
                    </View>
                    <View style={{ width: 70, alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => handleDeleteFeedRow(row.id)}
                        style={styles.deleteIconBtn}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Table Footer Totals */}
                <View style={styles.tableFooter}>
                  <Text style={[styles.tfCell, { width: 410, textAlign: "right", paddingRight: 16 }]}>
                    KUL HISAB (SUMMARY TOTALS):
                  </Text>
                  <Text style={[styles.tfCell, { width: 120 }]}>
                    {feedLog[0]?.receivedBags || 200} Bags In
                  </Text>
                  <Text style={[styles.tfCell, { width: 110, color: "#DC2626" }]}>
                    {totalFeedUsedAll} Bags Used
                  </Text>
                  <Text style={[styles.tfCell, { width: 120, color: "#065F46" }]}>
                    {currentFeedStock} Bags Baqi
                  </Text>
                  <Text style={[styles.tfCell, { width: 70 }]}>-</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHOOZA CALCULATION TABLE VIEW (HERO TABLE) */}
      {/* ========================================================================= */}
      {activeTab === "chooza" && (
        <View style={styles.portionWrapper}>
          {/* Action Header Bar */}
          <View style={styles.tableToolbar}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.tableTitle}>Chooza & Amwaat Register</Text>
                <View style={styles.recordBadgeDark}>
                  <Text style={styles.recordBadgeTextDark}>{choozaLog.length} Records</Text>
                </View>
              </View>
              <Text style={styles.tableSub}>
                Kitna chooza aaya, din aur raat ki amwaat, maut ki wajah aur zinda chooza
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowChoozaModal(true)}
                style={styles.actionBtnPrimaryDark}
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnTextWhite}>+ Nayi Chooza Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleExportPDF("chooza")}
                style={styles.actionBtnOutlineDark}
              >
                <Ionicons name="document-text-outline" size={15} color="#1E293B" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnTextDark}>Chooza PDF</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SPREADSHEET REGISTER TABLE */}
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={{ minWidth: 970 }}>
                {/* Table Header */}
                <View style={styles.tableHeadChooza}>
                  <Text style={[styles.thCell, { width: 45 }]}>#</Text>
                  <Text style={[styles.thCell, { width: 115 }]}>TAREEKH (DATE)</Text>
                  <Text style={[styles.thCell, { width: 85 }]}>DIN (DAY)</Text>
                  <Text style={[styles.thCell, { width: 110 }]}>KUL SHAMIL</Text>
                  <Text style={[styles.thCell, { width: 90 }]}>DIN MOUT</Text>
                  <Text style={[styles.thCell, { width: 95 }]}>SHAM MOUT</Text>
                  <Text style={[styles.thCell, { width: 105 }]}>24H TOTAL</Text>
                  <Text style={[styles.thCell, { width: 180, textAlign: "left", paddingLeft: 8 }]}>WAJAH (REASON)</Text>
                  <Text style={[styles.thCell, { width: 125 }]}>ZINDA CHOOZA</Text>
                  <Text style={[styles.thCell, { width: 70 }]}>ACTION</Text>
                </View>

                {/* Table Rows */}
                {choozaLog.map((row, index) => (
                  <View
                    key={row.id}
                    style={[
                      styles.tableRow,
                      { backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F8FAFC" },
                    ]}
                  >
                    <Text style={[styles.tdCell, { width: 45, color: "#64748B", fontWeight: "600" }]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.tdCell, { width: 115, fontWeight: "700" }]}>
                      {row.date}
                    </Text>
                    <View style={{ width: 85, alignItems: "center" }}>
                      <View style={styles.dayPill}>
                        <Text style={styles.dayPillText}>Day {row.dayNumber}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tdCell, { width: 110, fontWeight: "600" }]}>
                      {row.chicksPlaced.toLocaleString()}
                    </Text>
                    <Text style={[styles.tdCell, { width: 90, color: "#DC2626", fontWeight: "600" }]}>
                      {row.mortDay}
                    </Text>
                    <Text style={[styles.tdCell, { width: 95, color: "#DC2626", fontWeight: "600" }]}>
                      {row.mortNight}
                    </Text>
                    <View style={{ width: 105, alignItems: "center" }}>
                      <View style={styles.mortBadge}>
                        <Text style={styles.mortBadgeText}>{row.totalMort24h}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tdCell, { width: 180, textAlign: "left", paddingLeft: 8, fontSize: 11 }]}>
                      {row.deathReason}
                    </Text>
                    <View style={{ width: 125, alignItems: "center" }}>
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>{row.remainingBirds.toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={{ width: 70, alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => handleDeleteChoozaRow(row.id)}
                        style={styles.deleteIconBtn}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Table Footer Totals */}
                <View style={styles.tableFooter}>
                  <Text style={[styles.tfCell, { width: 355, textAlign: "right", paddingRight: 16 }]}>
                    KUL SUMMARY:
                  </Text>
                  <Text style={[styles.tfCell, { width: 90 }]}>-</Text>
                  <Text style={[styles.tfCell, { width: 95 }]}>-</Text>
                  <Text style={[styles.tfCell, { width: 105, color: "#DC2626" }]}>
                    {totalMortalityAll} Mort
                  </Text>
                  <Text style={[styles.tfCell, { width: 180, textAlign: "left", paddingLeft: 8 }]}>
                    Total Amwaat
                  </Text>
                  <Text style={[styles.tfCell, { width: 125, color: "#065F46" }]}>
                    {currentLiveBirds.toLocaleString()} Birds
                  </Text>
                  <Text style={[styles.tfCell, { width: 70 }]}>-</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOCTOR & MEDICAL TABLE VIEW (HERO TABLE) */}
      {/* ========================================================================= */}
      {activeTab === "doctor" && (
        <View style={styles.portionWrapper}>
          {/* Action Header Bar */}
          <View style={styles.tableToolbar}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.tableTitle}>Doctor & Medical Register</Text>
                <View style={styles.recordBadgePurple}>
                  <Text style={styles.recordBadgeTextPurple}>{medicalList.length} Guides</Text>
                </View>
              </View>
              <Text style={styles.tableSub}>
                Bimari, dawaai ka solution aur emergency doctor se direct 1-tap call
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowDoctorModal(true)}
              style={styles.actionBtnPrimaryPurple}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnTextWhite}>+ Add Medical Guide</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Search */}
          <View style={styles.searchBarBox}>
            <Ionicons name="search" size={18} color="#000000" style={{ marginRight: 8 }} />
            <TextInput
              value={searchDiseaseQuery}
              onChangeText={setSearchDiseaseQuery}
              placeholder="Bimari ya Dawaai talash karein (e.g. CRD, Saans, Colistin)..."
              placeholderTextColor="#64748B"
              style={styles.innerTextInput}
            />
            {searchDiseaseQuery ? (
              <TouchableOpacity onPress={() => setSearchDiseaseQuery("")}>
                <Ionicons name="close-circle" size={18} color="#000000" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* SPREADSHEET REGISTER TABLE */}
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={{ minWidth: 960 }}>
                {/* Table Header */}
                <View style={styles.tableHeadPurple}>
                  <Text style={[styles.thCell, { width: 45 }]}>#</Text>
                  <Text style={[styles.thCell, { width: 190, textAlign: "left", paddingLeft: 8 }]}>BIMARI KA NAAM (DISEASE)</Text>
                  <Text style={[styles.thCell, { width: 230, textAlign: "left", paddingLeft: 8 }]}>TAJWEEZ KARDA DAWAAI (SOLUTION)</Text>
                  <Text style={[styles.thCell, { width: 220, textAlign: "left", paddingLeft: 8 }]}>TEREEQA-E-ISTEMAAL (DOSAGE)</Text>
                  <Text style={[styles.thCell, { width: 170, textAlign: "left", paddingLeft: 8 }]}>DOCTOR KA NAAM</Text>
                  <Text style={[styles.thCell, { width: 110 }]}>RABTA (CALL)</Text>
                  <Text style={[styles.thCell, { width: 60 }]}>DEL</Text>
                </View>

                {/* Table Rows */}
                {filteredMedicalList.map((row, index) => (
                  <View
                    key={row.id}
                    style={[
                      styles.tableRow,
                      { backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#F8FAFC" },
                    ]}
                  >
                    <Text style={[styles.tdCell, { width: 45, color: "#64748B", fontWeight: "600" }]}>
                      {index + 1}
                    </Text>
                    <View style={{ width: 190, paddingLeft: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }}>
                        {row.diseaseName}
                      </Text>
                    </View>
                    <View style={{ width: 230, paddingLeft: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#7C3AED" }}>
                        {row.medicineSolution}
                      </Text>
                    </View>
                    <View style={{ width: 220, paddingLeft: 8 }}>
                      <Text style={{ fontSize: 11, color: "#475569" }}>
                        {row.instructions}
                      </Text>
                    </View>
                    <View style={{ width: 170, paddingLeft: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}>
                        {row.doctorName}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#64748B" }}>
                        {row.doctorPhone}
                      </Text>
                    </View>
                    <View style={{ width: 110, alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => handleCallDoctor(row.doctorPhone, row.doctorName)}
                        style={styles.tableCallBtn}
                      >
                        <Ionicons name="call" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.tableCallBtnText}>Call</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ width: 60, alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => handleDeleteDoctorRow(row.id)}
                        style={styles.deleteIconBtn}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 4. MASTER DAILY REPORT EXPORT (BOTTOM BAR) */}
      {/* ========================================================================= */}
      <View style={styles.bottomMasterCard}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
            Mukammal Rozana Working Register Report
          </Text>
          <Text style={{ fontSize: 11, color: "#64748B" }}>
            Feed + Chooza + Dawaai ka aik sath standard print / PDF export
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleExportPDF("full")}
          style={styles.masterPdfBtn}
        >
          <Ionicons name="print-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.masterPdfBtnText}>Daily Combined PDF</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW FEED ENTRY */}
      {/* ========================================================================= */}
      <Modal
        visible={showFeedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFeedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: "#065F46" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialCommunityIcons name="barley" size={20} color="#FFFFFF" />
                <Text style={styles.modalTitle}>Nayi Feed Entry Darj Karein</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFeedModal(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 14 }}>
              {/* Date Selection (Calendar Picker + Quick Chips) */}
              <DateSelector
                label="Tareekh Selection (Date)"
                isoValue={feedDateISO}
                onSelectDate={(iso, formatted) => {
                  setFeedDateISO(iso);
                  setFeedDate(formatted);
                  const diffDays = Math.round((new Date("2026-11-23").getTime() - new Date(iso).getTime()) / (1000 * 3600 * 24));
                  const calculatedDay = Math.max(1, 28 - diffDays);
                  setFeedDay(`${calculatedDay}`);
                }}
              />

              {/* Day Number */}
              <FormField
                label="Choozay Ka Din (Day)"
                value={feedDay}
                onChangeText={setFeedDay}
                placeholder="28"
                keyboardType="number-pad"
              />

              {/* Time Selection (Shift Chips + Time Pickers) */}
              <TimeRangeSelector
                start24={feedTimeStartISO}
                end24={feedTimeEndISO}
                start12={feedTimeStart}
                end12={feedTimeEnd}
                onSelectTimes={(s24, e24, s12, e12) => {
                  setFeedTimeStartISO(s24);
                  setFeedTimeEndISO(e24);
                  setFeedTimeStart(s12);
                  setFeedTimeEnd(e12);
                }}
              />

              {/* Row 3: Target & In Stock */}
              <View style={styles.formRow}>
                <FormField
                  label="Kin Ke Liye (Flock/Shed)"
                  value={feedTarget}
                  onChangeText={setFeedTarget}
                  placeholder="Shed 1 (Cobb 500)"
                  containerStyle={{ flex: 1.2, marginRight: 10, marginBottom: 0 }}
                />
                <FormField
                  label="Feed Aayi (Stock In Bags)"
                  value={feedReceived}
                  onChangeText={setFeedReceived}
                  placeholder="200"
                  keyboardType="numeric"
                  containerStyle={{ flex: 0.8, marginBottom: 0 }}
                />
              </View>

              {/* Row 4: Used Bags */}
              <FormField
                label="Aaj Kitni Bori Istemaal Hui (Used Bags)"
                value={feedUsed}
                onChangeText={setFeedUsed}
                placeholder="25"
                keyboardType="numeric"
                textColor="#DC2626"
              />

              {/* Live Auto Calculation Box */}
              <View style={styles.calcSummaryBoxGreen}>
                <View style={styles.calcSummaryRow}>
                  <Text style={styles.calcLabel}>Kul Stock (Received):</Text>
                  <Text style={styles.calcVal}>{numReceivedFeed} Bags ({numReceivedFeed * 50} kg)</Text>
                </View>
                <View style={styles.calcSummaryRow}>
                  <Text style={styles.calcLabel}>Istemaal (Used Feed):</Text>
                  <Text style={[styles.calcVal, { color: "#DC2626" }]}>
                    -{numUsedFeed} Bags ({numUsedFeed * 50} kg)
                  </Text>
                </View>
                <View style={[styles.calcSummaryRow, styles.calcBorderTop]}>
                  <Text style={[styles.calcLabel, { fontWeight: "800", color: "#065F46" }]}>
                    Baqi Bachi Hui Feed (Balance):
                  </Text>
                  <Text style={[styles.calcValBold, { color: "#065F46", fontSize: 16 }]}>
                    {numRemainingFeed} Bags ({numRemainingFeed * 50} kg)
                  </Text>
                </View>
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  onPress={() => setShowFeedModal(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Radd Karein</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveFeed}
                  style={styles.modalSaveBtnGreen}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.modalSaveText}>Table Mein Save Karein</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW CHOOZA ENTRY */}
      {/* ========================================================================= */}
      <Modal
        visible={showChoozaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChoozaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: "#0F172A" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialCommunityIcons name="bird" size={20} color="#FFFFFF" />
                <Text style={styles.modalTitle}>Nayi Chooza Entry Darj Karein</Text>
              </View>
              <TouchableOpacity onPress={() => setShowChoozaModal(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 14 }}>
              {/* Date Selection (Calendar Picker + Quick Chips) */}
              <DateSelector
                label="Tareekh Selection (Date)"
                isoValue={choozaDateISO}
                onSelectDate={(iso, formatted) => {
                  setChoozaDateISO(iso);
                  setChoozaDate(formatted);
                  const diffDays = Math.round((new Date("2026-11-23").getTime() - new Date(iso).getTime()) / (1000 * 3600 * 24));
                  const calculatedDay = Math.max(1, 28 - diffDays);
                  setChoozaDay(`${calculatedDay}`);
                }}
              />

              {/* Day Number */}
              <FormField
                label="Choozay Ka Din (Day)"
                value={choozaDay}
                onChangeText={setChoozaDay}
                placeholder="28"
                keyboardType="number-pad"
              />

              {/* Row 2: Total Added Chicks */}
              <FormField
                label="Kul Shamil Chooza (Total Flock Placed)"
                value={choozaTotalPlaced}
                onChangeText={setChoozaTotalPlaced}
                placeholder="19888"
                keyboardType="number-pad"
              />

              {/* Row 3: Day and Night Mortality */}
              <View style={styles.formRow}>
                <FormField
                  label="Din Ko Kitna Mara (Day Death)"
                  value={choozaMortDay}
                  onChangeText={setChoozaMortDay}
                  placeholder="0"
                  keyboardType="number-pad"
                  textColor="#DC2626"
                  containerStyle={{ flex: 1, marginRight: 10, marginBottom: 0 }}
                />
                <FormField
                  label="Sham Ko Kitna Mara (Night Death)"
                  value={choozaMortNight}
                  onChangeText={setChoozaMortNight}
                  placeholder="0"
                  keyboardType="number-pad"
                  textColor="#DC2626"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
              </View>

              {/* Row 4: Reason of Death */}
              <FormField
                label="Mout Ki Wajah (Death Reason)"
                value={choozaDeathReason}
                onChangeText={setChoozaDeathReason}
                placeholder="e.g. Garmi Ka Tanav, Kamzori, Saans Ka Masla"
              />

              {/* Live Auto Calculation Box */}
              <View style={styles.calcSummaryBoxDark}>
                <View style={styles.calcSummaryRow}>
                  <Text style={styles.calcLabel}>Aaj Ki 24h Amwaat (Day + Sham):</Text>
                  <Text style={[styles.calcValBold, { color: "#DC2626" }]}>
                    {totalDailyMort} Chooza ({numMortDay} Din + {numMortNight} Sham)
                  </Text>
                </View>
                <View style={[styles.calcSummaryRow, styles.calcBorderTop]}>
                  <Text style={[styles.calcLabel, { fontWeight: "800", color: "#0F172A" }]}>
                    Baqi Zinda Chooza (Remaining):
                  </Text>
                  <Text style={[styles.calcValBold, { color: "#059669", fontSize: 16 }]}>
                    {modalRemainingBirds.toLocaleString()} Birds
                  </Text>
                </View>
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  onPress={() => setShowChoozaModal(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Radd Karein</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveChooza}
                  style={styles.modalSaveBtnDark}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.modalSaveText}>Table Mein Save Karein</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW MEDICAL GUIDE */}
      {/* ========================================================================= */}
      <Modal
        visible={showDoctorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDoctorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: "#7C3AED" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialCommunityIcons name="stethoscope" size={20} color="#FFFFFF" />
                <Text style={styles.modalTitle}>Nayi Bimari & Dawaai Guide Shamil Karein</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDoctorModal(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 14 }}>
              {/* Doctor Details */}
              <View style={styles.formRow}>
                <FormField
                  label="Doctor Ka Naam"
                  value={guideDoctorName}
                  onChangeText={setGuideDoctorName}
                  placeholder="Dr. Ahsan (Poultry Specialist)"
                  containerStyle={{ flex: 1.2, marginRight: 10, marginBottom: 0 }}
                />
                <FormField
                  label="Doctor Phone Number"
                  value={guideDoctorPhone}
                  onChangeText={setGuideDoctorPhone}
                  placeholder="0300-5551234"
                  keyboardType="phone-pad"
                  containerStyle={{ flex: 0.8, marginBottom: 0 }}
                />
              </View>

              <FormField
                label="Bimari Ka Naam (Disease Name)"
                value={guideDiseaseName}
                onChangeText={setGuideDiseaseName}
                placeholder="e.g. CRD / Saans Ka Masla, E.Coli"
              />

              <FormField
                label="Tajweez Karda Dawaai (Medicine Solution)"
                value={guideSolution}
                onChangeText={setGuideSolution}
                placeholder="e.g. Ventilin + Mucolator + Respifine"
                textColor="#7C3AED"
              />

              <FormField
                label="Dene Ka Tareeqa / Miqdar (Dosage Instructions)"
                value={guideInstructions}
                onChangeText={setGuideInstructions}
                placeholder="Subah ke 200L paani mein 3 din musalsal"
              />

              {/* Modal Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  onPress={() => setShowDoctorModal(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Radd Karein</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveMedicalGuide}
                  style={styles.modalSaveBtnPurple}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.modalSaveText}>Guide Save Karein</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// =========================================================================
// HIGH-END ENTERPRISE TABLE & SCREEN STYLES
// =========================================================================
const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  topHeaderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#065F46",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  farmTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  userRoleText: {
    color: "#D1FAE5",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  batchBadge: {
    backgroundColor: "#047857",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  batchBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: "900",
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: "#94A3B8",
  },
  quickCallPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 3,
  },
  quickCallText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  segmentedNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 6,
  },
  segmentBtnActiveFeed: {
    backgroundColor: "#065F46",
  },
  segmentBtnActiveChooza: {
    backgroundColor: "#1E293B",
  },
  segmentBtnActiveDoctor: {
    backgroundColor: "#7C3AED",
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
  portionWrapper: {
    marginTop: 2,
  },
  tableToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  tableSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  recordBadgeGreen: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  recordBadgeTextGreen: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  recordBadgeDark: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  recordBadgeTextDark: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  recordBadgePurple: {
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  recordBadgeTextPurple: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  actionBtnPrimaryGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionBtnPrimaryDark: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionBtnPrimaryPurple: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#065F46",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionBtnOutlineDark: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionBtnTextWhite: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnTextGreen: {
    color: "#065F46",
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtnTextDark: {
    color: "#1E293B",
    fontSize: 11,
    fontWeight: "700",
  },
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tableHeadFeed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#065F46",
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  tableHeadChooza: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  tableHeadPurple: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6D28D9",
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  thCell: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tdCell: {
    fontSize: 11,
    color: "#1E293B",
    textAlign: "center",
  },
  dayPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  dayPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  usedBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  usedBadgeText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
  },
  balanceBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  balanceBadgeText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },
  mortBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  mortBadgeText: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },
  liveBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  liveBadgeText: {
    color: "#1E40AF",
    fontSize: 11,
    fontWeight: "800",
  },
  deleteIconBtn: {
    padding: 6,
    borderRadius: 4,
  },
  tableCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tableCallBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tableFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderTopWidth: 2,
    borderTopColor: "#CBD5E1",
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tfCell: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#000000",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  fieldLabelText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  blackInputBox: {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#000000", // SOLID 2PX JET BLACK BORDER!
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  innerTextInput: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    backgroundColor: "transparent",
    padding: 0,
    margin: 0,
    width: "100%",
    ...(Platform.OS === "web"
      ? ({
        outlineStyle: "none",
      } as any)
      : {}),
  },
  pickerInputText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    backgroundColor: "transparent",
    padding: 0,
    margin: 0,
    width: "100%",
    ...(Platform.OS === "web"
      ? ({
        cursor: "pointer",
        outlineStyle: "none",
        border: "none",
      } as any)
      : {}),
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  quickChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#000000",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickChipActiveGreen: {
    backgroundColor: "#059669",
    borderColor: "#000000",
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  quickChipTextActive: {
    color: "#FFFFFF",
  },
  shiftPresetChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#000000",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  shiftPresetChipActive: {
    backgroundColor: "#1E293B",
    borderColor: "#000000",
  },
  shiftPresetTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  shiftPresetTitleActive: {
    color: "#FFFFFF",
  },
  shiftPresetDesc: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  shiftPresetDescActive: {
    color: "#CBD5E1",
  },
  bottomMasterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    marginTop: 14,
  },
  masterPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  masterPdfBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "100%",
    maxWidth: 540,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  inputTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#475569",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    minHeight: 46,
  },
  calcSummaryBoxGreen: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#059669",
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  calcSummaryBoxDark: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#334155",
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  calcSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  calcBorderTop: {
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
    paddingTop: 6,
    marginTop: 4,
  },
  calcLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  calcVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
  },
  calcValBold: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
    paddingBottom: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  modalCancelText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  modalSaveBtnGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSaveBtnDark: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSaveBtnPurple: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
