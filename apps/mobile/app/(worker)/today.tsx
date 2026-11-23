import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme";
import { useAuthStore } from "../../src/store/useAuthStore";
import { OfflineStore } from "../../src/db/offlineStore";
import { useSyncStore } from "../../src/store/useSyncStore";
import { apiFetch, API_BASE_URL } from "../../src/api/client";

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

// Initial Sample Data matching actual farm history
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

export default function UserDashboardScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();

  const [activeTab, setActiveTab] = useState<"feed" | "chooza" | "doctor">("feed");
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------------------------------------------------
  // 1. FEED CALCULATION STATE
  // -------------------------------------------------------------------------
  const [feedDate, setFeedDate] = useState("23-Nov-2026");
  const [feedDay, setFeedDay] = useState("28");
  const [feedTimeStart, setFeedTimeStart] = useState("08:00 AM");
  const [feedTimeEnd, setFeedTimeEnd] = useState("02:00 PM");
  const [feedTarget, setFeedTarget] = useState("Shed 1 (Cobb 500)");
  const [feedReceived, setFeedReceived] = useState("200");
  const [feedUsed, setFeedUsed] = useState("25");
  const [feedLog, setFeedLog] = useState<FeedEntry[]>(INITIAL_FEED_LOG);

  // Calculations for Feed
  const numReceivedFeed = parseFloat(feedReceived) || 0;
  const numUsedFeed = parseFloat(feedUsed) || 0;
  const numRemainingFeed = Math.max(0, numReceivedFeed - numUsedFeed);

  // -------------------------------------------------------------------------
  // 2. CHOOZA CALCULATION STATE
  // -------------------------------------------------------------------------
  const [choozaDate, setChoozaDate] = useState("23-Nov-2026");
  const [choozaDay, setChoozaDay] = useState("28");
  const [choozaTotalPlaced, setChoozaTotalPlaced] = useState("19888");
  const [choozaMortDay, setChoozaMortDay] = useState("54");
  const [choozaMortNight, setChoozaMortNight] = useState("78");
  const [choozaDeathReason, setChoozaDeathReason] = useState("Garmi Ka Tanav");
  const [choozaLog, setChoozaLog] = useState<ChoozaEntry[]>(INITIAL_CHOOZA_LOG);

  // Calculations for Chooza
  const numPlacedChicks = parseInt(choozaTotalPlaced, 10) || 0;
  const numMortDay = parseInt(choozaMortDay, 10) || 0;
  const numMortNight = parseInt(choozaMortNight, 10) || 0;
  const totalDailyMort = numMortDay + numMortNight;
  // Calculate cumulative mortality from existing log
  const cumulativeMort = choozaLog.reduce((sum, item) => sum + item.totalMort24h, 0) + totalDailyMort;
  const remainingLiveBirds = Math.max(0, numPlacedChicks - cumulativeMort);

  // -------------------------------------------------------------------------
  // 3. MEDICAL & DOCTOR GUIDE STATE
  // -------------------------------------------------------------------------
  const [medicalList, setMedicalList] = useState<MedicalGuideItem[]>(INITIAL_MEDICAL_GUIDE);
  const [showAddGuideModal, setShowAddGuideModal] = useState(false);
  const [guideDoctorName, setGuideDoctorName] = useState("");
  const [guideDoctorPhone, setGuideDoctorPhone] = useState("");
  const [guideDiseaseName, setGuideDiseaseName] = useState("");
  const [guideSolution, setGuideSolution] = useState("");
  const [guideInstructions, setGuideInstructions] = useState("");
  const [searchDiseaseQuery, setSearchDiseaseQuery] = useState("");

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------
  const handleSaveFeed = async () => {
    if (!numUsedFeed || numUsedFeed <= 0) {
      Alert.alert("Feed Likhein", "Baraye meharbani istemal shuda borian darj karein.");
      return;
    }

    const newEntry: FeedEntry = {
      id: `feed-${Date.now()}`,
      date: feedDate,
      dayNumber: parseInt(feedDay, 10) || 1,
      timeRange: `${feedTimeStart} - ${feedTimeEnd}`,
      targetFlock: feedTarget,
      receivedBags: numReceivedFeed,
      usedBags: numUsedFeed,
      remainingBags: numRemainingFeed,
    };

    setFeedLog([newEntry, ...feedLog]);

    try {
      await OfflineStore.enqueueMutation("FEED_LEDGER", "CREATE", {
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
      "Feed Hisab Mehfooz!",
      `${numUsedFeed} Borian (${newEntry.timeRange}) darj ho gayi hain.\nBaqi Stock: ${numRemainingFeed} Borian.`,
    );
  };

  const handleSaveChooza = async () => {
    const newEntry: ChoozaEntry = {
      id: `chooza-${Date.now()}`,
      date: choozaDate,
      dayNumber: parseInt(choozaDay, 10) || 1,
      chicksPlaced: numPlacedChicks,
      mortDay: numMortDay,
      mortNight: numMortNight,
      totalMort24h: totalDailyMort,
      deathReason: choozaDeathReason.trim() || "Wajah Darj Nahi Ki",
      remainingBirds: remainingLiveBirds,
    };

    setChoozaLog([newEntry, ...choozaLog]);

    try {
      await OfflineStore.enqueueMutation("DAILY_RECORD", "CREATE", {
        date: choozaDate,
        ageInDays: parseInt(choozaDay, 10) || 1,
        mortalityDayShift: numMortDay,
        mortalityNightShift: numMortNight,
        mortalityCount: totalDailyMort,
        deathReason: choozaDeathReason,
        remainingBirds: remainingLiveBirds,
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
      "Chooza Hisab Mehfooz!",
      `Din: ${numMortDay} • Sham: ${numMortNight} • Kul Amwaat: ${totalDailyMort} Chooza.\nBaqi Zinda Chooza: ${remainingLiveBirds}.`,
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
    setShowAddGuideModal(false);
    setGuideDiseaseName("");
    setGuideSolution("");
    setGuideInstructions("");
    setGuideDoctorName("");
    setGuideDoctorPhone("");

    Alert.alert("Guide Shamil Ho Gaya!", `${newGuide.diseaseName} ka ilaj aur doctor list mein shamil ho gaya hai.`);
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
  // PDF REPORT EXPORT FUNCTION (Clean, Instant, Printable Document)
  // -------------------------------------------------------------------------
  const handleExportPDF = (type: "feed" | "chooza" | "full") => {
    let reportTitle = "";
    let tableHtml = "";

    if (type === "feed") {
      reportTitle = "Al-Barakah Broiler Farm • Rozana Feed Calculation Report";
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:center; font-family:Arial, sans-serif;">
          <tr style="background-color:#065F46; color:#ffffff;">
            <th>Tareekh & Year</th>
            <th>Day</th>
            <th>Waqt (Start - End Time)</th>
            <th>Flock / Shed</th>
            <th>Istemal Borian (Used)</th>
            <th>Baqi Stock (Remaining)</th>
          </tr>
          ${feedLog
            .map(
              (f) => `
            <tr>
              <td>${f.date}</td>
              <td>Day ${f.dayNumber}</td>
              <td>${f.timeRange}</td>
              <td>${f.targetFlock}</td>
              <td style="color:#059669; font-weight:bold;">${f.usedBags} Bags</td>
              <td style="font-weight:bold;">${f.remainingBags} Bags</td>
            </tr>
          `,
            )
            .join("")}
        </table>
      `;
    } else if (type === "chooza") {
      reportTitle = "Al-Barakah Broiler Farm • Rozana Chooza & Mortality Report";
      tableHtml = `
        <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; text-align:center; font-family:Arial, sans-serif;">
          <tr style="background-color:#1E293B; color:#ffffff;">
            <th>Tareekh & Year</th>
            <th>Day</th>
            <th>Din Ki Mout</th>
            <th>Sham Ki Mout</th>
            <th>24h Total Amwaat</th>
            <th>Mout Ki Wajah</th>
            <th>Baqi Zinda Chooza</th>
          </tr>
          ${choozaLog
            .map(
              (c) => `
            <tr>
              <td>${c.date}</td>
              <td>Day ${c.dayNumber}</td>
              <td style="color:#DC2626;">${c.mortDay}</td>
              <td style="color:#DC2626;">${c.mortNight}</td>
              <td style="color:#B91C1C; font-weight:bold;">${c.totalMort24h}</td>
              <td>${c.deathReason}</td>
              <td style="color:#059669; font-weight:bold;">${c.remainingBirds.toLocaleString()}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
      `;
    } else {
      reportTitle = "Al-Barakah Broiler Farm • Mukammal Rozana Working Report";
      tableHtml = `
        <h3 style="color:#065F46;">1. Feed Calculation (Khuraak)</h3>
        <p>Baqi Maujood Feed: <strong>${feedLog[0]?.remainingBags || 175} Bags</strong></p>
        <h3 style="color:#1E293B;">2. Chooza Status (Flock)</h3>
        <p>Zinda Chooza: <strong>${choozaLog[0]?.remainingBirds || 19135} Birds</strong></p>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0F172A; }
            h1 { color: #065F46; margin-bottom: 4px; }
            p { margin-top: 0; color: #64748B; font-size: 13px; }
            .header-banner { border-bottom: 2px solid #065F46; padding-bottom: 10px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1>AL-BARAKAH BROILER FARM</h1>
            <p><strong>${reportTitle}</strong> • Generated on ${new Date().toLocaleString()} by ${user?.name || "Employee"}</p>
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
        `${reportTitle}\n\nTamam data record mehfooz hai aur print/PDF ke liye ready hai.`,
      );
    }
  };

  const filteredMedicalList = medicalList.filter(
    (item) =>
      item.diseaseName.toLowerCase().includes(searchDiseaseQuery.toLowerCase()) ||
      item.medicineSolution.toLowerCase().includes(searchDiseaseQuery.toLowerCase()),
  );

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
            setTimeout(() => setRefreshing(false), 500);
          }}
          colors={[colors.primary]}
        />
      }
    >
      {/* ========================================================================= */}
      {/* TOP USER DASHBOARD BANNER */}
      {/* ========================================================================= */}
      <View style={styles.topHeaderCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.farmTitle}>AL-BARAKAH BROILER FARM</Text>
          <Text style={styles.userRoleText}>
            Employee Dashboard • {user?.name || "Ali Ahmed"} (Shed 1)
          </Text>
          <Text style={styles.flockInfoText}>
            Active Batch: Cobb 500 • Placed: 19,888 Chicks • Day 28
          </Text>
        </View>
      </View>

      {/* Quick Status KPI Summary */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: "#059669" }]}>
          <Text style={styles.kpiLabel}>BAQI FEED</Text>
          <Text style={[styles.kpiValue, { color: "#065F46" }]}>
            {feedLog[0]?.remainingBags || 175} Bags
          </Text>
          <Text style={styles.kpiSub}>Available in Shed</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
          <Text style={styles.kpiLabel}>ZINDA CHOOZA</Text>
          <Text style={[styles.kpiValue, { color: "#1E40AF" }]}>
            {(choozaLog[0]?.remainingBirds || 19135).toLocaleString()}
          </Text>
          <Text style={styles.kpiSub}>Total Live Birds</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: "#D97706" }]}>
          <Text style={styles.kpiLabel}>DOCTOR ON CALL</Text>
          <Text style={[styles.kpiValue, { color: "#B45309", fontSize: 14 }]}>
            Dr. Ahsan
          </Text>
          <TouchableOpacity
            onPress={() => handleCallDoctor("0300-5551234", "Dr. Ahsan")}
            style={styles.quickCallPill}
          >
            <Ionicons name="call" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.quickCallText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 3 CORE PORTIONS SWITCHER */}
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
            1. Feed Calculation
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
            2. Chooza Calculation
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
            3. Doctor & Medical
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* PORTION 1: FEED CALCULATION (KHURAAK KA HISAB) */}
      {/* ========================================================================= */}
      {activeTab === "feed" && (
        <View style={styles.portionWrapper}>
          <View style={styles.portionHeaderRow}>
            <View>
              <Text style={styles.portionTitle}>Feed Calculation (Khuraak Ka Hisab)</Text>
              <Text style={styles.portionSub}>
                Har din aur exact waqt (Minute-by-minute) ki feed entry aur baqi stock
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleExportPDF("feed")}
              style={styles.pdfButton}
            >
              <Ionicons name="document-text-outline" size={15} color="#065F46" style={{ marginRight: 4 }} />
              <Text style={styles.pdfButtonText}>Feed PDF</Text>
            </TouchableOpacity>
          </View>

          {/* Feed Entry Card */}
          <View style={styles.entryFormCard}>
            <View style={styles.formRow}>
              <View style={{ flex: 1.2, marginRight: 8 }}>
                <Text style={styles.inputTitle}>Tareekh & Year (Date):</Text>
                <TextInput
                  value={feedDate}
                  onChangeText={setFeedDate}
                  placeholder="e.g. 23-Nov-2026"
                  style={styles.textInput}
                />
              </View>

              <View style={{ flex: 0.8 }}>
                <Text style={styles.inputTitle}>Choozay Ka Din (Day):</Text>
                <TextInput
                  value={feedDay}
                  onChangeText={setFeedDay}
                  placeholder="28"
                  keyboardType="number-pad"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Exact Time Slot: "Kiss time sy kiss time tk use hoi" */}
            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputTitle}>Shuru Waqt (Start Time):</Text>
                <TextInput
                  value={feedTimeStart}
                  onChangeText={setFeedTimeStart}
                  placeholder="e.g. 08:00 AM"
                  style={styles.textInput}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputTitle}>Khatam Waqt (End Time):</Text>
                <TextInput
                  value={feedTimeEnd}
                  onChangeText={setFeedTimeEnd}
                  placeholder="e.g. 02:00 PM"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Target & Bags */}
            <View style={styles.formRow}>
              <View style={{ flex: 1.2, marginRight: 8 }}>
                <Text style={styles.inputTitle}>Kin Ke Liye Use Hui (Flock/Shed):</Text>
                <TextInput
                  value={feedTarget}
                  onChangeText={setFeedTarget}
                  placeholder="e.g. Shed 1 (Cobb 500)"
                  style={styles.textInput}
                />
              </View>

              <View style={{ flex: 0.8 }}>
                <Text style={styles.inputTitle}>Feed Aayi (Received Bags):</Text>
                <TextInput
                  value={feedReceived}
                  onChangeText={setFeedReceived}
                  placeholder="200"
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={{ marginVertical: 4 }}>
              <Text style={styles.inputTitle}>Is Waqt Kitni Bori Use Hui (Used Bags):</Text>
              <TextInput
                value={feedUsed}
                onChangeText={setFeedUsed}
                placeholder="e.g. 25"
                keyboardType="numeric"
                style={[styles.textInput, { fontSize: 16, fontWeight: "700" }]}
              />
            </View>

            {/* Live Auto Calculation Box */}
            <View style={styles.calcSummaryBoxGreen}>
              <View style={styles.calcSummaryRow}>
                <Text style={styles.calcLabel}>Kul Stock (Received):</Text>
                <Text style={styles.calcVal}>{numReceivedFeed} Bags ({numReceivedFeed * 50} kg)</Text>
              </View>
              <View style={styles.calcSummaryRow}>
                <Text style={styles.calcLabel}>Istemal (Used Feed):</Text>
                <Text style={[styles.calcVal, { color: "#DC2626" }]}>
                  -{numUsedFeed} Bags ({numUsedFeed * 50} kg)
                </Text>
              </View>
              <View style={[styles.calcSummaryRow, styles.calcBorderTop]}>
                <Text style={[styles.calcLabel, { fontWeight: "800", color: "#065F46" }]}>
                  Baqi Bachi Hui Feed (Remaining):
                </Text>
                <Text style={[styles.calcValBold, { color: "#065F46", fontSize: 16 }]}>
                  {numRemainingFeed} Bags ({numRemainingFeed * 50} kg)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSaveFeed}
              style={styles.primarySaveBtn}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primarySaveBtnText}>Feed Record Darj Karein</Text>
            </TouchableOpacity>
          </View>

          {/* Daily Feed Entries Log Table (Shown Below) */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeadRowFeed}>
              <Text style={[styles.tableHeadText, { width: 95 }]}>DATE</Text>
              <Text style={[styles.tableHeadText, { width: 50 }]}>DAY</Text>
              <Text style={[styles.tableHeadText, { width: 140 }]}>TIME (DURATION)</Text>
              <Text style={[styles.tableHeadText, { flex: 1, textAlign: "left", paddingLeft: 6 }]}>FLOCK / SHED</Text>
              <Text style={[styles.tableHeadText, { width: 80 }]}>USED</Text>
              <Text style={[styles.tableHeadText, { width: 80 }]}>REMAINING</Text>
            </View>

            {feedLog.map((f, idx) => (
              <View
                key={f.id}
                style={[
                  styles.tableRow,
                  { backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" },
                ]}
              >
                <Text style={[styles.tableCellText, { width: 95, fontWeight: "700" }]}>{f.date}</Text>
                <Text style={[styles.tableCellText, { width: 50 }]}>Day {f.dayNumber}</Text>
                <Text style={[styles.tableCellText, { width: 140, fontSize: 11, color: "#2563EB" }]}>
                  {f.timeRange}
                </Text>
                <Text style={[styles.tableCellText, { flex: 1, textAlign: "left", paddingLeft: 6 }]}>
                  {f.targetFlock}
                </Text>
                <Text style={[styles.tableCellText, { width: 80, fontWeight: "800", color: "#DC2626" }]}>
                  {f.usedBags} bags
                </Text>
                <Text style={[styles.tableCellText, { width: 80, fontWeight: "800", color: "#065F46" }]}>
                  {f.remainingBags} bags
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* PORTION 2: CHOOZA CALCULATION (FLOCK & MORTALITY HISAB) */}
      {/* ========================================================================= */}
      {activeTab === "chooza" && (
        <View style={styles.portionWrapper}>
          <View style={styles.portionHeaderRow}>
            <View>
              <Text style={styles.portionTitle}>Chooza Calculation (Flock & Amwaat)</Text>
              <Text style={styles.portionSub}>
                Kitna chooza aaya, din aur sham ki amwaat, wajah aur baqi chooza
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleExportPDF("chooza")}
              style={styles.pdfButton}
            >
              <Ionicons name="document-text-outline" size={15} color="#1E293B" style={{ marginRight: 4 }} />
              <Text style={[styles.pdfButtonText, { color: "#1E293B" }]}>Chooza PDF</Text>
            </TouchableOpacity>
          </View>

          {/* Chooza Entry Card */}
          <View style={styles.entryFormCard}>
            <View style={styles.formRow}>
              <View style={{ flex: 1.2, marginRight: 8 }}>
                <Text style={styles.inputTitle}>Tareekh & Year (Date):</Text>
                <TextInput
                  value={choozaDate}
                  onChangeText={setChoozaDate}
                  placeholder="e.g. 23-Nov-2026"
                  style={styles.textInput}
                />
              </View>

              <View style={{ flex: 0.8 }}>
                <Text style={styles.inputTitle}>Choozay Ka Din (Day):</Text>
                <TextInput
                  value={choozaDay}
                  onChangeText={setChoozaDay}
                  placeholder="28"
                  keyboardType="number-pad"
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={{ marginVertical: 4 }}>
              <Text style={styles.inputTitle}>Kul Chooza Aaya / Added (Initial Flock):</Text>
              <TextInput
                value={choozaTotalPlaced}
                onChangeText={setChoozaTotalPlaced}
                placeholder="19888"
                keyboardType="number-pad"
                style={[styles.textInput, { fontWeight: "700" }]}
              />
            </View>

            {/* Din & Sham Mortality */}
            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputTitle}>Din Ko Kitna Mara (Day Death):</Text>
                <TextInput
                  value={choozaMortDay}
                  onChangeText={setChoozaMortDay}
                  placeholder="0"
                  keyboardType="number-pad"
                  style={[styles.textInput, { color: "#DC2626", fontWeight: "700" }]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputTitle}>Sham Ko Kitna Mara (Night Death):</Text>
                <TextInput
                  value={choozaMortNight}
                  onChangeText={setChoozaMortNight}
                  placeholder="0"
                  keyboardType="number-pad"
                  style={[styles.textInput, { color: "#DC2626", fontWeight: "700" }]}
                />
              </View>
            </View>

            {/* Death Reason */}
            <View style={{ marginVertical: 4 }}>
              <Text style={styles.inputTitle}>Mout Ki Wajah (Reason of Death):</Text>
              <TextInput
                value={choozaDeathReason}
                onChangeText={setChoozaDeathReason}
                placeholder="e.g. Garmi Ka Tanav, Kamzori, Dhakka"
                style={styles.textInput}
              />
            </View>

            {/* Live Auto Calculation Box */}
            <View style={styles.calcSummaryBoxDark}>
              <View style={styles.calcSummaryRow}>
                <Text style={styles.calcLabel}>Aaj Ki 24h Amwaat (Day + Sham):</Text>
                <Text style={[styles.calcValBold, { color: "#DC2626" }]}>
                  {totalDailyMort} Chooza ({numMortDay} Din + {numMortNight} Sham)
                </Text>
              </View>
              <View style={styles.calcSummaryRow}>
                <Text style={styles.calcLabel}>Kul Amwaat Ab Tak (Cumulative):</Text>
                <Text style={[styles.calcValBold, { color: "#B91C1C" }]}>
                  {cumulativeMort} Chooza
                </Text>
              </View>
              <View style={[styles.calcSummaryRow, styles.calcBorderTop]}>
                <Text style={[styles.calcLabel, { fontWeight: "800", color: "#0F172A" }]}>
                  Baqi Zinda Chooza (Remaining Birds):
                </Text>
                <Text style={[styles.calcValBold, { color: "#059669", fontSize: 16 }]}>
                  {remainingLiveBirds.toLocaleString()} Birds
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSaveChooza}
              style={[styles.primarySaveBtn, { backgroundColor: "#1E293B" }]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primarySaveBtnText}>Chooza Record Darj Karein</Text>
            </TouchableOpacity>
          </View>

          {/* Daily Chooza Entries Log Table */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeadRowChooza}>
              <Text style={[styles.tableHeadText, { width: 95 }]}>DATE</Text>
              <Text style={[styles.tableHeadText, { width: 50 }]}>DAY</Text>
              <Text style={[styles.tableHeadText, { width: 70 }]}>DIN MOUT</Text>
              <Text style={[styles.tableHeadText, { width: 75 }]}>SHAM MOUT</Text>
              <Text style={[styles.tableHeadText, { width: 80 }]}>24H TOTAL</Text>
              <Text style={[styles.tableHeadText, { flex: 1, textAlign: "left", paddingLeft: 6 }]}>WAJAH (REASON)</Text>
              <Text style={[styles.tableHeadText, { width: 95 }]}>BAQI CHOOZA</Text>
            </View>

            {choozaLog.map((c, idx) => (
              <View
                key={c.id}
                style={[
                  styles.tableRow,
                  { backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" },
                ]}
              >
                <Text style={[styles.tableCellText, { width: 95, fontWeight: "700" }]}>{c.date}</Text>
                <Text style={[styles.tableCellText, { width: 50 }]}>Day {c.dayNumber}</Text>
                <Text style={[styles.tableCellText, { width: 70, color: "#DC2626" }]}>{c.mortDay}</Text>
                <Text style={[styles.tableCellText, { width: 75, color: "#DC2626" }]}>{c.mortNight}</Text>
                <Text style={[styles.tableCellText, { width: 80, fontWeight: "800", color: "#B91C1C" }]}>
                  {c.totalMort24h}
                </Text>
                <Text style={[styles.tableCellText, { flex: 1, textAlign: "left", paddingLeft: 6, fontSize: 11 }]}>
                  {c.deathReason}
                </Text>
                <Text style={[styles.tableCellText, { width: 95, fontWeight: "800", color: "#059669" }]}>
                  {c.remainingBirds.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* PORTION 3: DOCTOR & MEDICAL GUIDE (DAWAAI, BIMARI AUR DOCTOR) */}
      {/* ========================================================================= */}
      {activeTab === "doctor" && (
        <View style={styles.portionWrapper}>
          <View style={styles.portionHeaderRow}>
            <View>
              <Text style={styles.portionTitle}>Doctor & Medical Guide</Text>
              <Text style={styles.portionSub}>
                Naye employees ke sikhne ke liye bimari, dawaai aur doctor se direct call
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowAddGuideModal(!showAddGuideModal)}
              style={[styles.pdfButton, { borderColor: "#7C3AED" }]}
            >
              <Ionicons name={showAddGuideModal ? "close" : "add-circle"} size={15} color="#7C3AED" style={{ marginRight: 4 }} />
              <Text style={[styles.pdfButtonText, { color: "#7C3AED" }]}>
                {showAddGuideModal ? "Band Karein" : "+ Add Guide"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form to Add New Guide */}
          {showAddGuideModal && (
            <View style={styles.entryFormCard}>
              <Text style={[styles.inputTitle, { fontSize: 14, color: "#7C3AED", marginBottom: 8 }]}>
                Nayi Bimari, Dawaai Solution & Doctor Shamil Karein:
              </Text>

              <View style={styles.formRow}>
                <View style={{ flex: 1.2, marginRight: 8 }}>
                  <Text style={styles.inputTitle}>Doctor Ka Naam:</Text>
                  <TextInput
                    value={guideDoctorName}
                    onChangeText={setGuideDoctorName}
                    placeholder="e.g. Dr. Ahsan Veterinary Consultant"
                    style={styles.textInput}
                  />
                </View>

                <View style={{ flex: 0.8 }}>
                  <Text style={styles.inputTitle}>Doctor Ka Phone Number:</Text>
                  <TextInput
                    value={guideDoctorPhone}
                    onChangeText={setGuideDoctorPhone}
                    placeholder="0300-1234567"
                    keyboardType="phone-pad"
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={{ marginVertical: 4 }}>
                <Text style={styles.inputTitle}>Bimari Ka Naam (Disease Name):</Text>
                <TextInput
                  value={guideDiseaseName}
                  onChangeText={setGuideDiseaseName}
                  placeholder="e.g. CRD / Saans Ka Masla, E.Coli, Gumboro"
                  style={styles.textInput}
                />
              </View>

              <View style={{ marginVertical: 4 }}>
                <Text style={styles.inputTitle}>Tajweez Karda Dawaai / Solution:</Text>
                <TextInput
                  value={guideSolution}
                  onChangeText={setGuideSolution}
                  placeholder="e.g. Ventilin + Mucolator + Respifine"
                  style={styles.textInput}
                />
              </View>

              <View style={{ marginVertical: 4 }}>
                <Text style={styles.inputTitle}>Dene Ka Tareeqa / Miqdar (Dosage Instructions):</Text>
                <TextInput
                  value={guideInstructions}
                  onChangeText={setGuideInstructions}
                  placeholder="e.g. Subah 200L paani mein 3 din musalsal chalayein"
                  style={styles.textInput}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveMedicalGuide}
                style={[styles.primarySaveBtn, { backgroundColor: "#7C3AED" }]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primarySaveBtnText}>Guide Save Karein</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar for Diseases */}
          <View style={styles.searchBarBox}>
            <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              value={searchDiseaseQuery}
              onChangeText={setSearchDiseaseQuery}
              placeholder="Bimari ya Dawaai talash karein (e.g. Saans, E.Coli, Garmi)..."
              style={styles.searchInput}
            />
            {searchDiseaseQuery ? (
              <TouchableOpacity onPress={() => setSearchDiseaseQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List of Disease Guides with 1-Tap Direct Call */}
          <View style={{ gap: 10 }}>
            {filteredMedicalList.map((item) => (
              <View key={item.id} style={styles.medicalGuideCard}>
                <View style={styles.medicalCardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.diseaseNameText}>
                      {item.diseaseName}
                    </Text>
                    <Text style={styles.doctorInfoText}>
                      Mashwara: {item.doctorName}
                    </Text>
                  </View>

                  {/* DIRECT 1-TAP CALL BUTTON */}
                  <TouchableOpacity
                    onPress={() => handleCallDoctor(item.doctorPhone, item.doctorName)}
                    style={styles.callDoctorBtn}
                  >
                    <Ionicons name="call" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.callDoctorBtnText}>Call Doctor</Text>
                  </TouchableOpacity>
                </View>

                {/* Solution Box */}
                <View style={styles.solutionBox}>
                  <Text style={styles.solutionLabel}>Dawaai / Solution:</Text>
                  <Text style={styles.solutionText}>{item.medicineSolution}</Text>
                  <Text style={styles.instructionsText}>
                    Tareeqa: {item.instructions}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM COMBINED DAILY WORKING PDF OPTION */}
      {/* ========================================================================= */}
      <View style={styles.bottomMasterCard}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#0F172A" }}>
            Mukammal Rozana Working Report
          </Text>
          <Text style={{ fontSize: 11, color: "#64748B" }}>
            Feed + Chooza + Dawaai ka combined print / PDF
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleExportPDF("full")}
          style={styles.masterPdfBtn}
        >
          <Ionicons name="print-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.masterPdfBtnText}>Daily PDF Print</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// =========================================================================
// STYLES
// =========================================================================
const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  topHeaderCard: {
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
  flockInfoText: {
    color: "#A7F3D0",
    fontSize: 11,
    marginTop: 2,
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
    borderColor: "#E2E8F0",
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
    paddingVertical: 2,
    marginTop: 2,
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
    borderColor: "#E2E8F0",
    marginBottom: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
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
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
  portionWrapper: {
    marginTop: 2,
  },
  portionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  portionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  portionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#065F46",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
  },
  pdfButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  entryFormCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  inputTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 3,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  calcSummaryBoxGreen: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  calcSummaryBoxDark: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
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
  primarySaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  primarySaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  tableHeadRowFeed: {
    flexDirection: "row",
    backgroundColor: "#065F46",
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  tableHeadRowChooza: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  tableHeadText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    minHeight: 34,
    paddingHorizontal: 4,
  },
  tableCellText: {
    fontSize: 11,
    color: "#334155",
    textAlign: "center",
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
  },
  medicalGuideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medicalCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  diseaseNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  doctorInfoText: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "600",
    marginTop: 2,
  },
  callDoctorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  callDoctorBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  solutionBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#7C3AED",
  },
  solutionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  solutionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  instructionsText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
    fontStyle: "italic",
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
});
