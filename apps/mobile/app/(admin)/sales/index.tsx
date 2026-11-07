import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { useTheme } from "../../../src/theme";
import { Card, Badge, Button, Input } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";
import { calculateLiftingBirds } from "@broiler/shared";

export default function SalesScreen() {
  const { colors, typography, spacing } = useTheme();

  const [sales, setSales] = useState<any[]>([]);
  const [sheds, setSheds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lifting consistency state
  const [consistencyData, setConsistencyData] = useState<any>(null);

  // New Sale Form
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [selectedShedId, setSelectedShedId] = useState("");
  const [lotNumber, setLotNumber] = useState("1");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [totalLiveWeightKg, setTotalLiveWeightKg] = useState("3475");
  const [averageWeightKg, setAverageWeightKg] = useState("2.25");
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [overrideBirdCount, setOverrideBirdCount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [ratePerKg, setRatePerKg] = useState("380"); // Manually editable
  const [amountPaid, setAmountPaid] = useState("1000000");
  const [vehicleNo, setVehicleNo] = useState("");
  const [submittingSale, setSubmittingSale] = useState(false);

  // Payment installment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSaleId, setPaymentSaleId] = useState("");
  const [payBuyerName, setPayBuyerName] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  // Real-time calculated birds using shared formula
  const numTotalWeight = parseFloat(totalLiveWeightKg) || 0;
  const numAvgWeight = parseFloat(averageWeightKg) || 0;
  const liftingCalc = calculateLiftingBirds(
    numTotalWeight,
    numAvgWeight,
    isManualOverride ? parseInt(overrideBirdCount, 10) || 0 : undefined,
    overrideReason,
  );
  const finalBirdsSold = liftingCalc.birds;
  const totalCalculatedAmount = numTotalWeight * (parseFloat(ratePerKg) || 0);

  const loadData = async () => {
    try {
      const salesRes = await apiFetch("/api/sales");
      if (salesRes.success && salesRes.data) setSales(salesRes.data);

      const shedRes = await apiFetch("/api/sheds");
      if (shedRes.success && shedRes.data) {
        setSheds(shedRes.data);
        const activeShed = shedRes.data[0];
        if (!selectedShedId && activeShed) {
          setSelectedShedId(activeShed._id);
          const bId = activeShed.currentBatch?._id || activeShed.currentBatchId;
          if (bId) fetchConsistency(bId);
        }
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchConsistency = async (batchId: string) => {
    try {
      const res = await apiFetch(`/api/sales/consistency/${batchId}`);
      if (res.success && res.data) {
        setConsistencyData(res.data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectShed = (shedId: string) => {
    setSelectedShedId(shedId);
    const shed = sheds.find((s) => s._id === shedId);
    const bId = shed?.currentBatch?._id || shed?.currentBatchId;
    if (bId) fetchConsistency(bId);
  };

  const handleCreateSale = async () => {
    const shed = sheds.find((s) => s._id === selectedShedId);
    const batchId = shed?.currentBatch?._id || shed?.currentBatchId;
    if (!batchId) {
      Alert.alert(
        "Error",
        "Selected shed has no active batch to lift birds from.",
      );
      return;
    }
    if (!buyerName.trim()) {
      Alert.alert("Required", "Buyer name is required.");
      return;
    }

    setSubmittingSale(true);
    try {
      const res = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          batchId,
          shedId: selectedShedId,
          lotNumber: parseInt(lotNumber, 10) || 1,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          date: new Date().toISOString().split("T")[0],
          totalLiveWeightKg: numTotalWeight,
          averageWeightKg: numAvgWeight,
          birdsSold: finalBirdsSold,
          isManualBirdCountOverride: isManualOverride,
          overrideReason: isManualOverride ? overrideReason.trim() : undefined,
          ratePerKg: parseFloat(ratePerKg),
          amountPaid: parseFloat(amountPaid) || 0,
          vehicleNo: vehicleNo.trim(),
        }),
      });

      if (res.success) {
        Alert.alert(
          "Sale Invoiced",
          `Lot #${lotNumber} recorded for ${finalBirdsSold} birds (${numTotalWeight} kg).`,
        );
        setShowSaleForm(false);
        loadData();
        fetchConsistency(batchId);
      } else {
        Alert.alert("Error", res.error || "Failed to save sale");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingSale(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      Alert.alert("Required", "Please enter valid payment amount.");
      return;
    }

    setSubmittingPay(true);
    try {
      const res = await apiFetch("/api/sales/payment", {
        method: "POST",
        body: JSON.stringify({
          saleId: paymentSaleId,
          buyerName: payBuyerName,
          date: new Date().toISOString().split("T")[0],
          amount: parseFloat(payAmount),
          paymentMethod: "cash",
        }),
      });

      if (res.success) {
        Alert.alert(
          "Payment Logged",
          "Buyer payment received and balance reduced.",
        );
        setShowPaymentModal(false);
        setPayAmount("");
        loadData();
      } else {
        Alert.alert("Error", res.error || "Failed to record payment");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingPay(false);
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
      <View style={styles.headerRow}>
        <View>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            Bird Catching & Lifting Notes (Gari Bharai)
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            Partial lifting lots, auto-calculated bird counts, and consistency reconciliation
          </Text>
        </View>

        <Button
          testID="new-sale-toggle-btn"
          title={showSaleForm ? "Cancel" : "+ New Catching Lot"}
          size="sm"
          onPress={() => setShowSaleForm(!showSaleForm)}
        />
      </View>

      {/* Flock Reconciliation & Consistency Card */}
      {consistencyData && (
        <Card
          elevated
          testID="lifting-consistency-card"
          style={{
            marginVertical: spacing.sm,
            borderColor: consistencyData.isConsistent ? colors.primary : colors.warning,
            borderWidth: 1.5,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14 }}>
              Flock Lifting Reconciliation ({consistencyData.batchNumber})
            </Text>
            <Badge
              testID="consistency-status-badge"
              label={consistencyData.isConsistent ? "RECONCILED" : "DISCREPANCY"}
              variant={consistencyData.isConsistent ? "success" : "warning"}
              size="sm"
            />
          </View>

          <View style={styles.reconGrid}>
            <View style={styles.reconCell}>
              <Text style={styles.reconVal}>{consistencyData.chicksPlaced?.toLocaleString()}</Text>
              <Text style={styles.reconLbl}>Placed</Text>
            </View>
            <View style={styles.reconCell}>
              <Text style={[styles.reconVal, { color: colors.danger }]}>
                -{consistencyData.totalMortality}
              </Text>
              <Text style={styles.reconLbl}>Mortality</Text>
            </View>
            <View style={styles.reconCell}>
              <Text style={[styles.reconVal, { color: colors.primary }]}>
                -{consistencyData.totalLifted}
              </Text>
              <Text style={styles.reconLbl}>Total Lifted</Text>
            </View>
            <View style={styles.reconCell}>
              <Text style={[styles.reconVal, { color: colors.text }]}>
                ={consistencyData.reportedRemaining}
              </Text>
              <Text style={styles.reconLbl}>Remaining</Text>
            </View>
          </View>

          {consistencyData.warning && (
            <Text testID="lifting-warning-text" style={{ color: colors.warning, fontSize: 12, marginTop: 6, fontStyle: "italic" }}>
              {consistencyData.warning}
            </Text>
          )}
        </Card>
      )}

      {/* Sale / Lifting Form */}
      {showSaleForm ? (
        <Card
          elevated
          testID="lifting-sale-form"
          style={{ borderColor: colors.primary, marginVertical: 10 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Record Catching (Lifting) Lot
          </Text>

          <Text
            style={{
              color: colors.text,
              fontSize: 12,
              fontWeight: "600",
              marginBottom: 6,
            }}
          >
            Select Shed to Lift From:
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}
          >
            {sheds.map((s) => (
              <TouchableOpacity
                key={s._id}
                onPress={() => handleSelectShed(s._id)}
                testID={`select-shed-${s._id}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedShedId === s._id
                        ? colors.primary
                        : colors.surface,
                    borderColor:
                      selectedShedId === s._id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selectedShedId === s._id ? colors.white : colors.text,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 0.3 }}>
              <Input
                testID="lot-number-input"
                label="Lot #"
                value={lotNumber}
                onChangeText={setLotNumber}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 0.67 }}>
              <Input
                testID="buyer-name-input"
                label="Buyer / Dealer Name"
                placeholder="e.g. Haji Aslam Chicken Merchant"
                value={buyerName}
                onChangeText={setBuyerName}
              />
            </View>
          </View>

          <Input
            testID="buyer-phone-input"
            label="Buyer Phone"
            placeholder="0300-1234567"
            value={buyerPhone}
            onChangeText={setBuyerPhone}
            keyboardType="phone-pad"
          />

          {/* Catching Auto-computation Fields: Total Weight & Avg Weight */}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ flex: 0.48 }}>
              <Input
                testID="total-weight-input"
                label="Total Live Weight (kg)"
                value={totalLiveWeightKg}
                onChangeText={setTotalLiveWeightKg}
                keyboardType="decimal-pad"
                suffix="kg"
              />
            </View>
            <View style={{ flex: 0.48 }}>
              <Input
                testID="avg-weight-input"
                label="Average Weight (kg)"
                value={averageWeightKg}
                onChangeText={setAverageWeightKg}
                keyboardType="decimal-pad"
                suffix="kg/bird"
              />
            </View>
          </View>

          {/* Auto Computed Birds Badge */}
          <View style={[styles.autoBirdsCard, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Computed Birds = Total Weight / Avg Weight:
            </Text>
            <Text testID="computed-birds-text" style={{ color: colors.primary, fontSize: 20, fontWeight: "800", marginTop: 2 }}>
              {liftingCalc.calculatedBirds} birds
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              {numTotalWeight} kg ÷ {numAvgWeight} kg = {liftingCalc.calculatedBirds} birds
            </Text>
          </View>

          {/* Manual Override Option */}
          <View style={styles.overrideRow}>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
              Manually override bird count?
            </Text>
            <Switch
              testID="override-switch"
              value={isManualOverride}
              onValueChange={setIsManualOverride}
            />
          </View>

          {isManualOverride && (
            <View style={{ marginBottom: 6 }}>
              <Input
                testID="override-count-input"
                label="Verified Bird Count"
                placeholder={liftingCalc.calculatedBirds.toString()}
                value={overrideBirdCount}
                onChangeText={setOverrideBirdCount}
                keyboardType="numeric"
                suffix="birds"
              />
              <Input
                testID="override-reason-input"
                label="Reason for Override"
                placeholder="e.g. Coop head count verified by weighbridge supervisor"
                value={overrideReason}
                onChangeText={setOverrideReason}
              />
            </View>
          )}

          <Input
            testID="rate-per-kg-input"
            label="Rate Per Kg (PKR - Manually Editable)"
            value={ratePerKg}
            onChangeText={setRatePerKg}
            keyboardType="decimal-pad"
            suffix="Rs./kg"
          />

          <View
            style={[
              styles.invoicePreview,
              {
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 10,
                marginVertical: 6,
              },
            ]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Total Invoiced Amount ({finalBirdsSold} birds @ Rs. {ratePerKg}/kg):
            </Text>
            <Text
              testID="total-invoice-amount-text"
              style={{ color: colors.primary, fontSize: 20, fontWeight: "800" }}
            >
              Rs. {totalCalculatedAmount.toLocaleString()}
            </Text>
          </View>

          <Input
            testID="amount-paid-input"
            label="Amount Paid Upfront"
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="decimal-pad"
            suffix="Rs."
          />
          <Input
            testID="vehicle-no-input"
            label="Vehicle Number (Gaari No.)"
            placeholder="e.g. LES-1234"
            value={vehicleNo}
            onChangeText={setVehicleNo}
          />

          <Button
            testID="submit-sale-btn"
            title="Confirm Catching Lot Sale"
            onPress={handleCreateSale}
            loading={submittingSale}
          />
        </Card>
      ) : null}

      {/* Payment Installment Modal */}
      {showPaymentModal ? (
        <Card
          elevated
          testID="payment-modal"
          style={{ borderColor: colors.secondary, marginVertical: 10 }}
        >
          <Text
            style={{
              color: colors.secondary,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Record Buyer Installment Payment
          </Text>
          <Text style={{ color: colors.text, fontSize: 13, marginBottom: 8 }}>
            Buyer: <Text style={{ fontWeight: "700" }}>{payBuyerName}</Text>
          </Text>

          <Input
            label="Payment Amount (PKR)"
            placeholder="e.g. 500000"
            value={payAmount}
            onChangeText={setPayAmount}
            keyboardType="decimal-pad"
            suffix="Rs."
          />

          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Button
              title="Cancel"
              variant="outline"
              size="sm"
              onPress={() => setShowPaymentModal(false)}
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Save Payment"
              size="sm"
              onPress={handleRecordPayment}
              loading={submittingPay}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : null}

      {/* Sales Invoices List */}
      <Text
        style={{
          color: colors.text,
          fontSize: typography.sizes.md,
          fontWeight: typography.weights.bold,
          marginVertical: 8,
        }}
      >
        Recent Catching Lots & Invoices ({sales.length})
      </Text>

      {sales.map((sale) => (
        <Card key={sale._id} elevated style={{ marginVertical: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                Lot #{sale.lotNumber || 1} • {sale.buyerName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {sale.date} • Shed: {sale.shedId?.name || "Shed"}
              </Text>
            </View>

            <Badge
              label={(sale.paymentStatus || "pending").toUpperCase()}
              variant={
                sale.paymentStatus === "paid"
                  ? "success"
                  : sale.paymentStatus === "partial"
                    ? "warning"
                    : "danger"
              }
              size="sm"
            />
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Birds Sold
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                {sale.birdsSold?.toLocaleString()}
                {sale.isManualBirdCountOverride && (
                  <Text style={{ color: colors.warning, fontSize: 10 }}> (Overridden)</Text>
                )}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Live Weight
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                {sale.totalLiveWeightKg} kg
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Rate / kg
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Rs. {sale.ratePerKg}
              </Text>
            </View>
          </View>

          <View style={[styles.invoiceDetails, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Invoiced: Rs. {sale.totalAmount?.toLocaleString()}
              </Text>
              <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>
                Paid: Rs. {sale.amountPaid?.toLocaleString() || "0"}
              </Text>
            </View>

            {sale.balanceAmount > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{ color: colors.danger, fontWeight: "700", fontSize: 13 }}
                >
                  Balance Due: Rs. {sale.balanceAmount?.toLocaleString()}
                </Text>

                <Button
                  title="Receive Payment"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    setPaymentSaleId(sale._id);
                    setPayBuyerName(sale.buyerName);
                    setPayAmount(sale.balanceAmount.toString());
                    setShowPaymentModal(true);
                  }}
                />
              </View>
            )}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  reconGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  reconCell: {
    alignItems: "center",
  },
  reconVal: {
    fontWeight: "800",
    fontSize: 15,
  },
  reconLbl: {
    fontSize: 10,
    color: "#6B7280",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  autoBirdsCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    marginVertical: 6,
  },
  overrideRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  invoicePreview: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  invoiceDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
});
