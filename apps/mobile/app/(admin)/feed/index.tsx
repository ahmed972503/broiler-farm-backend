import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
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

export default function FeedManagementScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;

  const [stocks, setStocks] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [sheds, setSheds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Purchase modal/form
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [supplier, setSupplier] = useState("National Feeds Ltd");
  const [purchaseFeedType, setPurchaseFeedType] = useState<
    "starter" | "grower" | "finisher"
  >("grower");
  const [purchaseBags, setPurchaseBags] = useState("100");
  const [ratePerBag, setRatePerBag] = useState("4200");
  const [amountPaid, setAmountPaid] = useState("420000");
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  // Issue modal/form
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueShedId, setIssueShedId] = useState("");
  const [issueFeedType, setIssueFeedType] = useState<
    "starter" | "grower" | "finisher"
  >("grower");
  const [issueBags, setIssueBags] = useState("10");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const loadData = async () => {
    try {
      const stockRes = await apiFetch("/api/feed/stock");
      if (stockRes.success && stockRes.data) setStocks(stockRes.data);

      const reconRes = await apiFetch("/api/feed/reconciliation");
      if (reconRes.success && reconRes.data) setReconciliation(reconRes.data);

      const shedRes = await apiFetch("/api/sheds");
      if (shedRes.success && shedRes.data) {
        setSheds(shedRes.data);
        if (!issueShedId && shedRes.data.length > 0)
          setIssueShedId(shedRes.data[0]._id);
      }
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

  const handleCreatePurchase = async () => {
    setSubmittingPurchase(true);
    try {
      const bags = parseInt(purchaseBags, 10);
      const rate = parseFloat(ratePerBag);
      const paid = parseFloat(amountPaid) || 0;
      const totalAmount = bags * rate;

      const res = await apiFetch("/api/feed/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplier: supplier.trim(),
          date: new Date().toISOString().split("T")[0],
          feedType: purchaseFeedType,
          bags,
          ratePerBag: rate,
          amountPaid: paid,
          paymentStatus:
            paid >= totalAmount ? "paid" : paid > 0 ? "partial" : "pending",
        }),
      });

      if (res.success) {
        Alert.alert(
          "Feed Purchase Recorded",
          "Stock updated and expense logged.",
        );
        setShowPurchaseForm(false);
        loadData();
      } else {
        Alert.alert("Error", res.error || "Failed to record purchase");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const handleIssueFeed = async () => {
    const selectedShed = sheds.find((s) => s._id === issueShedId);
    if (!selectedShed?.currentBatch?._id && !selectedShed?.currentBatchId) {
      Alert.alert("Error", "Selected shed has no active flock.");
      return;
    }

    setSubmittingIssue(true);
    try {
      const res = await apiFetch("/api/feed/issues", {
        method: "POST",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          shedId: issueShedId,
          batchId:
            selectedShed.currentBatch?._id || selectedShed.currentBatchId,
          feedType: issueFeedType,
          bags: parseFloat(issueBags),
        }),
      });

      if (res.success) {
        Alert.alert(
          "Feed Issued",
          "Bags issued to shed and deducted from warehouse stock.",
        );
        setShowIssueForm(false);
        loadData();
      } else {
        Alert.alert("Error", res.error || "Failed to issue feed");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmittingIssue(false);
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
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            Feed Management (Khorak Ka Stock)
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            Warehouse inventory, supplier deliveries, shed dispatches, and
            reconciliation
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, width: isMobile ? "100%" : "auto" }}>
          <Button
            title="+ Purchase Delivery"
            size="sm"
            onPress={() => setShowPurchaseForm(!showPurchaseForm)}
            style={{ flex: isMobile ? 1 : undefined }}
          />
          <Button
            title="Issue to Shed"
            variant="secondary"
            size="sm"
            onPress={() => setShowIssueForm(!showIssueForm)}
            style={{ flex: isMobile ? 1 : undefined }}
          />
        </View>
      </View>

      {/* Purchase Form */}
      {showPurchaseForm ? (
        <Card
          elevated
          style={{ borderColor: colors.primary, marginVertical: 10 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
              marginBottom: 8,
            }}
          >
            Record Supplier Feed Delivery
          </Text>
          <Input
            label="Supplier Name"
            value={supplier}
            onChangeText={setSupplier}
          />
          <Input
            label="Bags Count"
            value={purchaseBags}
            onChangeText={setPurchaseBags}
            keyboardType="numeric"
            suffix="bags"
          />
          <Input
            label="Rate Per Bag (PKR)"
            value={ratePerBag}
            onChangeText={setRatePerBag}
            keyboardType="decimal-pad"
            suffix="Rs."
          />
          <Input
            label="Amount Paid (PKR)"
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="decimal-pad"
            suffix="Rs."
          />
          <Button
            title="Save Delivery & Update Stock"
            onPress={handleCreatePurchase}
            loading={submittingPurchase}
          />
        </Card>
      ) : null}

      {/* Issue Form */}
      {showIssueForm ? (
        <Card
          elevated
          style={{ borderColor: colors.secondary, marginVertical: 10 }}
        >
          <Text
            style={{
              color: colors.secondary,
              fontSize: typography.sizes.md,
              fontWeight: typography.weights.bold,
              marginBottom: 8,
            }}
          >
            Dispatch Feed to Shed
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 13,
              fontWeight: "600",
              marginBottom: 6,
            }}
          >
            Select Shed:
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}
          >
            {sheds.map((s) => (
              <TouchableOpacity
                key={s._id}
                onPress={() => setIssueShedId(s._id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      issueShedId === s._id ? colors.secondary : colors.surface,
                    borderColor:
                      issueShedId === s._id ? colors.secondary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: issueShedId === s._id ? colors.white : colors.text,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input
            label="Bags to Dispatch"
            value={issueBags}
            onChangeText={setIssueBags}
            keyboardType="decimal-pad"
            suffix="bags"
          />
          <Button
            title="Dispatch Feed to Shed"
            variant="secondary"
            onPress={handleIssueFeed}
            loading={submittingIssue}
          />
        </Card>
      ) : null}

      {/* Current Warehouse Stocks */}
      <Text
        style={{
          color: colors.text,
          fontSize: typography.sizes.lg,
          fontWeight: typography.weights.bold,
          marginTop: spacing.md,
          marginBottom: 8,
        }}
      >
        Warehouse Feed Stock Levels
      </Text>

      <View style={styles.gridRow}>
        {stocks.map((s) => {
          const isLow = s.currentBags <= s.reorderThresholdBags;
          return (
            <View
              key={s.feedType}
              style={{
                width: isMobile ? "100%" : isTablet ? "50%" : "33.333%",
                padding: 4,
              }}
            >
              <StatCard
                title={s.feedType}
                value={`${s.currentBags} bags`}
                subtitle={`= ${s.currentKg} kg live stock`}
                badgeLabel={isLow ? "LOW STOCK" : "AVAILABLE"}
                badgeVariant={isLow ? "danger" : "success"}
              />
            </View>
          );
        })}
      </View>

      {/* Feed Reconciliation Card */}
      {reconciliation ? (
        <Card elevated style={{ marginTop: spacing.lg }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.base,
              fontWeight: typography.weights.bold,
            }}
          >
            Feed Consumption vs Issuance Reconciliation
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.xs,
              marginBottom: 12,
            }}
          >
            Verifies feed issued to sheds matches what was recorded as consumed
            by workers
          </Text>

          <View style={styles.reconRow}>
            <Text style={{ color: colors.textSecondary }}>
              Total Issued to Sheds:
            </Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {reconciliation.totalIssuedKg} kg (
              {reconciliation.totalIssuedBags} bags)
            </Text>
          </View>

          <View style={styles.reconRow}>
            <Text style={{ color: colors.textSecondary }}>
              Total Consumed in Daily Logs:
            </Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {reconciliation.totalConsumedKg} kg (
              {reconciliation.totalConsumedBags} bags)
            </Text>
          </View>

          <View
            style={[
              styles.reconRow,
              {
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 8,
                marginTop: 4,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              Difference / Variance:
            </Text>
            <Badge
              label={`${reconciliation.discrepancyBags >= 0 ? "+" : ""}${reconciliation.discrepancyBags} bags (${reconciliation.discrepancyKg} kg)`}
              variant={
                Math.abs(reconciliation.discrepancyBags) <= 2
                  ? "success"
                  : "warning"
              }
            />
          </View>
        </Card>
      ) : null}
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
    flexWrap: "wrap",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  gridCol3: {
    width: "33.333%",
    padding: 4,
    minWidth: 180,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  reconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
});
