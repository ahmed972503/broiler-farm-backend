import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../src/theme";
import { Button, Input, Card } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function CreateBatchScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ shedId?: string }>();

  const todayStr = new Date().toISOString().split("T")[0];
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + 38);
  const expectedDateStr = expectedDate.toISOString().split("T")[0];

  const [sheds, setSheds] = useState<any[]>([]);
  const [selectedShedId, setSelectedShedId] = useState<string>(
    params.shedId || "",
  );
  const [batchNumber, setBatchNumber] = useState(
    `FLOCK-2026-${Math.floor(100 + Math.random() * 900)}`,
  );
  const [chicksPlaced, setChicksPlaced] = useState("5000");
  const [placementDate, setPlacementDate] = useState(todayStr);
  const [expectedCloseDate, setExpectedCloseDate] = useState(expectedDateStr);
  const [supplier, setSupplier] = useState("Jadeed Chicks");
  const [breed, setBreed] = useState("Cobb 500");
  const [chickRate, setChickRate] = useState("115");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSheds = async () => {
      const res = await apiFetch("/api/sheds");
      if (res.success && res.data) {
        setSheds(res.data);
        if (!selectedShedId && res.data.length > 0) {
          // Select first available empty shed if possible
          const emptyShed = res.data.find((s: any) => s.status !== "active");
          setSelectedShedId(emptyShed ? emptyShed._id : res.data[0]._id);
        }
      }
    };
    fetchSheds();
  }, []);

  const totalInitialCost =
    (parseInt(chicksPlaced, 10) || 0) * (parseFloat(chickRate) || 0);

  const handleSubmit = async () => {
    if (!selectedShedId) {
      Alert.alert("Required", "Please select a shed for this batch.");
      return;
    }
    if (!batchNumber.trim() || !supplier.trim()) {
      Alert.alert("Required", "Flock number and supplier name are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          batchNumber: batchNumber.trim(),
          shedId: selectedShedId,
          chicksPlaced: parseInt(chicksPlaced, 10),
          placementDate,
          expectedCloseDate,
          supplier: supplier.trim(),
          breed: breed.trim(),
          chickRate: parseFloat(chickRate),
        }),
      });

      if (res.success) {
        Alert.alert(
          "Success",
          "New flock successfully placed! Vaccination schedule automatically seeded.",
        );
        router.replace("/(admin)/batches");
      } else {
        Alert.alert("Error", res.error || "Failed to place batch");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: typography.sizes.xl,
          fontWeight: typography.weights.heavy,
          marginBottom: 4,
        }}
      >
        Place New Flock (Naye Choozay)
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.sizes.sm,
          marginBottom: spacing.md,
        }}
      >
        Setup new broiler flock batch and auto-seed vaccination schedule
      </Text>

      <Card elevated>
        {/* Shed Selector */}
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.sm,
            fontWeight: typography.weights.semibold,
            marginBottom: 8,
          }}
        >
          Select Shed (Darrha Chunein)
        </Text>
        <View style={styles.shedChipRow}>
          {sheds.map((shed) => (
            <TouchableOpacity
              key={shed._id}
              onPress={() => setSelectedShedId(shed._id)}
              style={[
                styles.shedChip,
                {
                  backgroundColor:
                    selectedShedId === shed._id
                      ? colors.primary
                      : colors.surface,
                  borderColor:
                    selectedShedId === shed._id
                      ? colors.primary
                      : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedShedId === shed._id ? colors.white : colors.text,
                  fontWeight: "600",
                  fontSize: typography.sizes.xs,
                }}
              >
                {shed.name} {shed.status === "active" ? "(Busy)" : "(Ready)"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Flock Number (Batch Code)"
          value={batchNumber}
          onChangeText={setBatchNumber}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Chicks Placed"
              value={chicksPlaced}
              onChangeText={setChicksPlaced}
              keyboardType="numeric"
              suffix="birds"
            />
          </View>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Chick Rate (PKR)"
              value={chickRate}
              onChangeText={setChickRate}
              keyboardType="decimal-pad"
              suffix="Rs."
            />
          </View>
        </View>

        <View
          style={[
            styles.costPreview,
            {
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.xs,
            }}
          >
            Initial Flock Cost:
          </Text>
          <Text
            style={{ color: colors.primary, fontSize: 18, fontWeight: "800" }}
          >
            Rs. {totalInitialCost.toLocaleString()}
          </Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Placement Date"
              value={placementDate}
              onChangeText={setPlacementDate}
            />
          </View>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Expected Close Date"
              value={expectedCloseDate}
              onChangeText={setExpectedCloseDate}
            />
          </View>
        </View>

        <Input
          label="Hatchery / Supplier Name"
          value={supplier}
          onChangeText={setSupplier}
        />

        <Input label="Breed" value={breed} onChangeText={setBreed} />

        <Button
          title={
            submitting ? "Placing Flock..." : "Place Chicks & Seed Schedule"
          }
          onPress={handleSubmit}
          loading={submitting}
          size="lg"
          style={{ marginTop: spacing.md }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  shedChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  shedChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  costPreview: {},
});
