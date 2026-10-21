import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Card, Badge } from '../../src/components/ui';
import { apiFetch } from '../../src/api/client';
import { OfflineStore } from '../../src/db/offlineStore';

export default function WorkerHistoryScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user } = useAuthStore();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const shedId = user?.assignedShedId || user?.shed?.id;

  const loadHistory = async () => {
    try {
      if (shedId) {
        const res = await apiFetch(`/api/daily-records?shedId=${shedId}`);
        if (res.success && res.data) {
          setRecords(res.data);
        } else {
          const cached = await OfflineStore.getLocalCache('DAILY_RECORD');
          setRecords(cached);
        }
      }
    } catch {
      const cached = await OfflineStore.getLocalCache('DAILY_RECORD');
      setRecords(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [shedId]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory(); }} colors={[colors.primary]} />}
    >
      <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold }]}>
        Rozana Ka Khata History
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.md }}>
        Past daily logs for {user?.shed?.name || 'Shed'}
      </Text>

      {records.length === 0 ? (
        <Card style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>No past daily records found</Text>
        </Card>
      ) : (
        records.map(record => (
          <Card key={record._id || record.id || record.date} style={{ marginVertical: 6 }} elevated>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.text, fontSize: typography.sizes.base, fontWeight: typography.weights.bold }}>
                  {record.date} (Day {record.ageInDays})
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}>
                  Logged by {record.createdBy?.name || user?.name || 'Worker'}
                </Text>
              </View>

              <Badge
                label={record.isLocked ? '🔒 LOCKED' : '✏️ EDITABLE'}
                variant={record.isLocked ? 'neutral' : 'success'}
                size="sm"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 16 }}>
                  {record.mortalityCount}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>Mortality</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>
                  {record.feedUsedBags} bags
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{record.feedType}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={{ color: colors.secondary, fontWeight: '700', fontSize: 16 }}>
                  {record.waterLiters} L
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>Water</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                  {record.minTemp}°-{record.maxTemp}°
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>Temp</Text>
              </View>
            </View>

            {record.mortalityCause ? (
              <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 6 }}>
                Cause: {record.mortalityCause}
              </Text>
            ) : null}
            {record.notes ? (
              <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs, marginTop: 2, fontStyle: 'italic' }}>
                Note: {record.notes}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  },
  title: {},
  divider: {
    height: 1,
    marginVertical: 10
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricItem: {
    alignItems: 'center'
  }
});
