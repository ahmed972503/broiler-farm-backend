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
import { Card, Badge, Button, Input } from "../../../src/components/ui";
import { apiFetch } from "../../../src/api/client";

export default function InventoryScreen() {
  const { colors, typography, spacing } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "medicine" | "equipment" | "consumable"
  >("all");

  // Add Item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<
    "medicine" | "equipment" | "consumable"
  >("medicine");
  const [quantity, setQuantity] = useState("10");
  const [unit, setUnit] = useState("bottles");
  const [expiryDate, setExpiryDate] = useState("2027-01-01");
  const [reorderLevel, setReorderLevel] = useState("3");
  const [submitting, setSubmitting] = useState(false);

  const loadItems = async () => {
    try {
      const res = await apiFetch("/api/inventory");
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Item name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          category,
          quantity: parseFloat(quantity) || 0,
          unit: unit.trim(),
          expiryDate: category === "medicine" ? expiryDate : null,
          reorderLevel: parseInt(reorderLevel, 10) || 2,
        }),
      });

      if (res.success) {
        Alert.alert("Success", "Inventory item added.");
        setShowAddForm(false);
        setName("");
        loadItems();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter((item) => {
    if (categoryFilter === "all") return true;
    return item.category === categoryFilter;
  });

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
            loadItems();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.heavy,
            }}
          >
            Farm Inventory (Samaan Ka Stock)
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            Medicines with expiry alerts, equipment, and farm consumables
          </Text>
        </View>

        <Button
          title={showAddForm ? "Cancel" : "+ Add Item"}
          size="sm"
          onPress={() => setShowAddForm(!showAddForm)}
        />
      </View>

      {/* Add Form */}
      {showAddForm ? (
        <Card
          elevated
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
            Add Inventory Item
          </Text>
          <Input
            label="Item Name"
            placeholder="e.g. Enrofloxacin 10%"
            value={name}
            onChangeText={setName}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ flex: 0.48 }}>
              <Input
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 0.48 }}>
              <Input
                label="Unit"
                placeholder="bottles, kg, pcs"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>
          <Input
            label="Expiry Date (YYYY-MM-DD)"
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
          <Button
            title="Save Item"
            onPress={handleAddItem}
            loading={submitting}
          />
        </Card>
      ) : null}

      {/* Category Tabs */}
      <View style={styles.tabRow}>
        {(["all", "medicine", "equipment", "consumable"] as const).map(
          (cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategoryFilter(cat)}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    categoryFilter === cat ? colors.primary : colors.surface,
                  borderColor:
                    categoryFilter === cat ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: categoryFilter === cat ? colors.white : colors.text,
                  fontSize: 12,
                  fontWeight: "700",
                  textTransform: "uppercase",
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {/* Item Cards */}
      {filtered.map((item) => {
        const isLow = item.quantity <= item.reorderLevel;
        const todayStr = new Date().toISOString().split("T")[0];
        const isExpiring = item.expiryDate && item.expiryDate <= todayStr;

        return (
          <Card key={item._id} style={{ marginVertical: 5 }} elevated>
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
                    fontSize: typography.sizes.base,
                    fontWeight: typography.weights.bold,
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.sizes.xs,
                  }}
                >
                  Category: {item.category.toUpperCase()} • Reorder Level:{" "}
                  {item.reorderLevel} {item.unit}
                </Text>
              </View>

              <Badge
                label={
                  isExpiring ? "EXPIRED" : isLow ? "LOW STOCK" : "IN STOCK"
                }
                variant={isExpiring ? "danger" : isLow ? "warning" : "success"}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text
                style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}
              >
                {item.quantity} {item.unit}
              </Text>
              {item.expiryDate ? (
                <Text
                  style={{
                    color: isExpiring ? colors.danger : colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  Expiry: {item.expiryDate}
                </Text>
              ) : null}
            </View>
          </Card>
        );
      })}
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
    gap: 10,
    marginBottom: 10,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  tab: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
  },
});
