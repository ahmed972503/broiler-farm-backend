import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme';
import { Card, Badge, Button } from '../../../src/components/ui';
import { apiFetch } from '../../../src/api/client';

export default function ShedsListScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const [sheds, setSheds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSheds = async () => {
    try {
      const res = await apiFetch('/api/sheds');
      if (res.success && res.data) {
        setSheds(res.data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSheds();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSheds(); }} colors={[colors.primary]} />}
    >
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy }}>
          Farm Sheds (Darrhay)
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          All 5 broiler houses, assigned workers, and active flock details
        </Text>
      </View>

      {sheds.map(shed => {
        const batch = shed.currentBatch;
        return (
          <Card key={shed._id} elevated style={{ marginVertical: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }}>
                  {shed.name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}>
                  Capacity: {shed.capacity.toLocaleString()} birds • Worker: {shed.assignedWorkerId?.name || 'Owner/Admin'}
                </Text>
              </View>

              <Badge
                label={shed.status.toUpperCase()}
                variant={shed.status === 'active' ? 'success' : shed.status === 'cleaning' ? 'warning' : 'neutral'}
              />
            </View>

            {batch ? (
              <View style={[styles.flockInfo, { backgroundColor: colors.surface, marginTop: 10, padding: 10, borderRadius: 8 }]}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                  Active Flock: {batch.batchNumber} (Day {batch.ageInDays})
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Remaining: {batch.birdsRemaining?.toLocaleString()} birds • Cumulative Mortality: {batch.cumulativeMortality}
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                Currently empty / cleaning
              </Text>
            )}

            <Button
              title="View Shed Details"
              variant="outline"
              size="sm"
              onPress={() => router.push(`/(admin)/sheds/${shed._id}` as any)}
              style={{ marginTop: 12 }}
            />
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  },
  flockInfo: {}
});
