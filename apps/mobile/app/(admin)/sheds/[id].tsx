import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme';
import { Card, Badge, Button, StatCard } from '../../../src/components/ui';
import { apiFetch } from '../../../src/api/client';

export default function ShedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();

  const [shed, setShed] = useState<any>(null);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await apiFetch(`/api/sheds/${id}`);
      if (res.success && res.data) {
        setShed(res.data);
      }
      const recordsRes = await apiFetch(`/api/daily-records?shedId=${id}`);
      if (recordsRes.success && recordsRes.data) {
        setDailyRecords(recordsRes.data);
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
  }, [id]);

  const activeBatch = shed?.activeBatch;

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />}
    >
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy }}>
          {shed?.name || 'Shed Details'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Capacity: {shed?.capacity?.toLocaleString()} birds • Assigned Worker: {shed?.assignedWorkerId?.name || 'Admin'}
        </Text>
      </View>

      {/* Active Flock Card */}
      {activeBatch ? (
        <Card elevated>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold }}>
              Active Flock: {activeBatch.batchNumber}
            </Text>
            <Badge label="ACTIVE FLOCK" variant="success" size="sm" />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 4 }}>
            Placed: {activeBatch.chicksPlaced?.toLocaleString()} ({activeBatch.breed}) on {activeBatch.placementDate}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Button
              title="Close Flock (Harvest)"
              variant="danger"
              size="sm"
              onPress={() => router.push(`/(admin)/batches/${activeBatch._id}` as any)}
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="View Full Flock Report"
              variant="outline"
              size="sm"
              onPress={() => router.push(`/(admin)/reports?batchId=${activeBatch._id}` as any)}
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
        </Card>
      ) : (
        <Card style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Shed is empty / ready for chick placement</Text>
          <Button
            title="Place New Flock in this Shed"
            onPress={() => router.push(`/(admin)/batches/create?shedId=${id}` as any)}
          />
        </Card>
      )}

      {/* Recent Daily Logs */}
      <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.bold, marginTop: spacing.lg, marginBottom: 8 }}>
        Recent Daily Records ({dailyRecords.length})
      </Text>

      {dailyRecords.slice(0, 10).map(r => (
        <Card key={r._id} style={{ marginVertical: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
              {r.date} (Day {r.ageInDays})
            </Text>
            <Badge label={r.isLocked ? 'LOCKED' : 'OPEN'} variant={r.isLocked ? 'neutral' : 'success'} size="sm" />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
            Mortality: {r.mortalityCount} • Feed: {r.feedUsedBags} bags ({r.feedUsedKg} kg) • Water: {r.waterLiters}L • Temp: {r.minTemp}°-{r.maxTemp}°C
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  }
});
