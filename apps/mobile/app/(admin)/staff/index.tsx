import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "../../../src/theme";
import {
  Card,
  Badge,
  Button,
  Input,
  StatCard,
} from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function StaffManagementScreen() {
  const { colors, typography, spacing } = useTheme();

  const [staffList, setStaffList] = useState<any[]>([]);
  const [wageSummaries, setWageSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Advance Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("2000");
  const [advanceReason, setAdvanceReason] = useState("Medical emergency");
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  const loadData = async () => {
    try {
      const staffRes = await apiFetch("/api/staff");
      if (staffRes.success && staffRes.data) setStaffList(staffRes.data);

      const wageRes = await apiFetch("/api/staff/wages");
      if (wageRes.success && wageRes.data) setWageSummaries(wageRes.data);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordAdvance = async () => {
    if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
      Alert.alert("Required", "Valid advance amount required.");
      return;
    }

    setSubmittingAdvance(true);
    try {
      const res = await apiFetch("/api/staff/advances", {
        method: "POST",
        body: JSON.stringify({
          staffId: selectedStaffId,
          date: new Date().toISOString().split("T")[0],
          amount: parseFloat(advanceAmount),
          reason: advanceReason.trim(),
        }),
      });

      if (res.success) {
        Alert.alert(
          "Advance Paid",
          "Wage advance recorded and logged as labour expense.",
        );
        setShowAdvanceModal(false);
        loadData();
      } else {
        Alert.alert("Error", res.error || "Failed to record advance");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingAdvance(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          padding: spacing.base,
          maxWidth: 1000,
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
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.xl,
            fontWeight: typography.weights.heavy,
          }}
        >
          Staff & Wages (Mulazmeen & Tankhwah)
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}
        >
          Attendance tracking, daily wages, cash advances, and monthly payroll
          statements
        </Text>
      </View>

      {/* Advance Modal */}
      {showAdvanceModal ? (
        <Card
          elevated
          style={{ borderColor: colors.primary, marginBottom: spacing.md }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            Pay Cash Advance to {selectedStaffName}
          </Text>
          <Input
            label="Advance Amount in PKR"
            value={advanceAmount}
            onChangeText={setAdvanceAmount}
            keyboardType="numeric"
            suffix="Rs."
          />
          <Input
            label="Reason for Advance"
            value={advanceReason}
            onChangeText={setAdvanceReason}
          />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8,
            }}
          >
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowAdvanceModal(false)}
              style={{ flex: 1, minWidth: 100 }}
            />
            <Button
              title="Pay Advance"
              onPress={handleRecordAdvance}
              loading={submittingAdvance}
              style={{ flex: 1, minWidth: 120 }}
            />
          </View>
        </Card>
      ) : null}

      {/* Monthly Wage Summary */}
      <Text
        style={{
          color: colors.text,
          fontSize: typography.sizes.lg,
          fontWeight: typography.weights.bold,
          marginBottom: 8,
        }}
      >
        Current Month Payroll Statement
      </Text>

      {wageSummaries.map((item) => (
        <Card key={item.staffId} elevated style={{ marginVertical: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}
              >
                {item.staffName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Daily Wage: Rs. {item.dailyWage} • Present: {item.presentDays}{" "}
                days • Half: {item.halfDays}
              </Text>
            </View>

            <Badge
              label={`NET: Rs. ${item.netPayable?.toLocaleString()}`}
              variant="success"
            />
          </View>

          <View
            style={[
              styles.wageMetrics,
              {
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 8,
                marginTop: 8,
              },
            ]}
          >
            <View style={styles.cell}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Rs. {item.grossWage?.toLocaleString()}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Gross Earned
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={{ color: colors.danger, fontWeight: "700" }}>
                -Rs. {item.advancesDeducted?.toLocaleString()}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Advances Deducted
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Rs. {item.netPayable?.toLocaleString()}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                Net Payable
              </Text>
            </View>
          </View>

          <Button
            title="+ Pay Advance"
            variant="outline"
            size="sm"
            onPress={() => {
              setSelectedStaffId(item.staffId);
              setSelectedStaffName(item.staffName);
              setShowAdvanceModal(true);
            }}
            style={{ marginTop: 8 }}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  wageMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cell: {
    alignItems: "center",
    flex: 1,
  },
});
