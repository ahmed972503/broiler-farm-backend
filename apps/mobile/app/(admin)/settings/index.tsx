import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useTheme } from "../../../src/theme";
import { Card, Button, Input } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function SettingsScreen() {
  const { colors, typography, spacing } = useTheme();

  const [farmName, setFarmName] = useState("Al-Barakah Broiler Farm");
  const [ownerName, setOwnerName] = useState("Haji Muhammad Ahmed");
  const [location, setLocation] = useState("Okara, Punjab, Pakistan");
  const [phone, setPhone] = useState("0300-1234567");
  const [bagWeight, setBagWeight] = useState("50.0");

  // Alert Thresholds
  const [mortalitySpike, setMortalitySpike] = useState("0.8");
  const [lowFeedBags, setLowFeedBags] = useState("20");
  const [minTemp, setMinTemp] = useState("20.0");
  const [maxTemp, setMaxTemp] = useState("34.0");
  const [medExpiryDays, setMedExpiryDays] = useState("30");
  const [paymentOverdueDays, setPaymentOverdueDays] = useState("14");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await apiFetch("/api/settings");
      if (res.success && res.data) {
        const d = res.data;
        if (d.farmName) setFarmName(d.farmName);
        if (d.ownerName) setOwnerName(d.ownerName);
        if (d.location) setLocation(d.location);
        if (d.phone) setPhone(d.phone);
        if (d.defaultFeedBagWeightKg)
          setBagWeight(d.defaultFeedBagWeightKg.toString());

        if (d.alertThresholds) {
          const t = d.alertThresholds;
          if (t.mortalitySpikePercentDaily)
            setMortalitySpike(t.mortalitySpikePercentDaily.toString());
          if (t.lowFeedStockBags) setLowFeedBags(t.lowFeedStockBags.toString());
          if (t.tempMinCelsius) setMinTemp(t.tempMinCelsius.toString());
          if (t.tempMaxCelsius) setMaxTemp(t.tempMaxCelsius.toString());
          if (t.medicineExpiryWarningDays)
            setMedExpiryDays(t.medicineExpiryWarningDays.toString());
          if (t.paymentOverdueDays)
            setPaymentOverdueDays(t.paymentOverdueDays.toString());
        }
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          farmName: farmName.trim(),
          ownerName: ownerName.trim(),
          location: location.trim(),
          phone: phone.trim(),
          defaultFeedBagWeightKg: parseFloat(bagWeight) || 50,
          alertThresholds: {
            mortalitySpikePercentDaily: parseFloat(mortalitySpike) || 0.8,
            lowFeedStockBags: parseInt(lowFeedBags, 10) || 20,
            tempMinCelsius: parseFloat(minTemp) || 20,
            tempMaxCelsius: parseFloat(maxTemp) || 34,
            medicineExpiryWarningDays: parseInt(medExpiryDays, 10) || 30,
            paymentOverdueDays: parseInt(paymentOverdueDays, 10) || 14,
          },
        }),
      });

      if (res.success) {
        Alert.alert(
          "Settings Saved",
          "Farm profile and alert thresholds updated.",
        );
      } else {
        Alert.alert("Error", res.error || "Failed to update settings");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
    >
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.xl,
            fontWeight: typography.weights.heavy,
          }}
        >
          Farm Settings & Operational Thresholds
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}
        >
          Configure farm identity, default bag weight, and automated alert
          trigger levels
        </Text>
      </View>

      {/* Veterinary Verification Required Banner */}
      <Card
        style={{
          backgroundColor: colors.warningBg,
          borderColor: colors.warning,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.warning,
            fontWeight: typography.weights.bold,
            fontSize: typography.sizes.sm,
            marginBottom: 4,
          }}
        >
          ⚠️ Veterinary Verification Required
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}
        >
          Standard broiler vaccination calendar and Cobb 500 growth curves are
          reference baselines and must be verified by a licensed poultry
          veterinarian for specific flock conditions.
        </Text>
      </Card>

      {/* Farm Profile Card */}
      <Card elevated>
        <Text
          style={{
            color: colors.primary,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Farm Identity & Profile
        </Text>
        <Input label="Farm Name" value={farmName} onChangeText={setFarmName} />
        <Input
          label="Owner / Manager Name"
          value={ownerName}
          onChangeText={setOwnerName}
        />
        <Input
          label="Location / Address"
          value={location}
          onChangeText={setLocation}
        />
        <Input label="Contact Phone" value={phone} onChangeText={setPhone} />
        <Input
          label="Default Feed Bag Weight (kg)"
          value={bagWeight}
          onChangeText={setBagWeight}
          keyboardType="decimal-pad"
          suffix="kg/bag"
          helperText="Pakistan poultry standard is 50.0 kg"
        />
      </Card>

      {/* Automated Alert Thresholds */}
      <Card elevated style={{ marginTop: spacing.md }}>
        <Text
          style={{
            color: colors.secondary,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Automated Alert Thresholds
        </Text>

        <Input
          label="Daily Mortality Spike Trigger (%)"
          value={mortalitySpike}
          onChangeText={setMortalitySpike}
          keyboardType="decimal-pad"
          suffix="%"
          helperText="Triggers critical alert if single-day mortality exceeds this rate"
        />

        <Input
          label="Low Feed Stock Warning Level"
          value={lowFeedBags}
          onChangeText={setLowFeedBags}
          keyboardType="numeric"
          suffix="bags"
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Min Temp Alarm (°C)"
              value={minTemp}
              onChangeText={setMinTemp}
              keyboardType="decimal-pad"
              suffix="°C"
            />
          </View>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Max Temp Alarm (°C)"
              value={maxTemp}
              onChangeText={setMaxTemp}
              keyboardType="decimal-pad"
              suffix="°C"
            />
          </View>
        </View>

        <Input
          label="Medicine Expiry Warning Window"
          value={medExpiryDays}
          onChangeText={setMedExpiryDays}
          keyboardType="numeric"
          suffix="days"
        />

        <Input
          label="Pending Payment Overdue Window"
          value={paymentOverdueDays}
          onChangeText={setPaymentOverdueDays}
          keyboardType="numeric"
          suffix="days"
        />

        <Button
          title={saving ? "Saving Settings..." : "Save Settings & Thresholds"}
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={{ marginTop: spacing.sm }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
});
