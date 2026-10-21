import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Card, Badge, StatCard, Button } from '../../src/components/ui';
import { apiFetch } from '../../src/api/client';
import { useTranslation } from 'react-i18next';

export default function AdminDashboardScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const isWide = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await apiFetch('/api/dashboard');
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.warn('Dashboard fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
      if (res.success) {
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sheds = dashboardData?.sheds || [];
  const alerts = dashboardData?.alerts?.list || [];
  const financials = dashboardData?.financials || {};
  const feedStocks = dashboardData?.feedStocks || [];

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} colors={[colors.primary]} />}
    >
      {/* Dashboard Top Header & Quick Actions */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.heading, { color: colors.text, fontSize: typography.sizes.xxl, fontWeight: typography.weights.heavy }]}>
            {t('nav.dashboard')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            Real-time live monitoring of all 5 sheds & farm operations
          </Text>
        </View>

        <View style={styles.topActionButtons}>
          <Button
            title="+ New Batch"
            size="sm"
            onPress={() => router.push('/(admin)/batches/create' as any)}
            style={{ marginRight: 8 }}
          />
          <Button
            title="+ Record Sale"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/(admin)/sales' as any)}
            style={{ marginRight: 8 }}
          />
          <Button
            title="Reports"
            variant="outline"
            size="sm"
            onPress={() => router.push('/(admin)/reports' as any)}
          />
        </View>
      </View>

      {/* Financial Overview Cards */}
      <View style={[styles.gridRow, { marginTop: spacing.md }]}>
        <View style={[styles.gridCol4, { padding: spacing.xs }]}>
          <StatCard
            title={t('dashboard.totalRevenue')}
            value={`Rs. ${(financials.totalSalesRevenue || 0).toLocaleString()}`}
            subtitle="Sales invoiced"
            badgeLabel="Sales"
            badgeVariant="success"
          />
        </View>
        <View style={[styles.gridCol4, { padding: spacing.xs }]}>
          <StatCard
            title={t('dashboard.totalExpenses')}
            value={`Rs. ${(financials.totalExpenses || 0).toLocaleString()}`}
            subtitle="Flocks & farm overhead"
            badgeLabel="Expenses"
            badgeVariant="warning"
          />
        </View>
        <View style={[styles.gridCol4, { padding: spacing.xs }]}>
          <StatCard
            title={t('dashboard.netProfit')}
            value={`Rs. ${(financials.netFarmProfit || 0).toLocaleString()}`}
            subtitle="All-time net margin"
            badgeLabel={financials.netFarmProfit >= 0 ? 'Profit' : 'Loss'}
            badgeVariant={financials.netFarmProfit >= 0 ? 'success' : 'danger'}
          />
        </View>
        <View style={[styles.gridCol4, { padding: spacing.xs }]}>
          <StatCard
            title={t('dashboard.receivables')}
            value={`Rs. ${(financials.outstandingReceivables || 0).toLocaleString()}`}
            subtitle="Unpaid buyer balance"
            badgeLabel="Receivables"
            badgeVariant="danger"
          />
        </View>
      </View>

      {/* Critical Alerts Banner Section */}
      {alerts.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.danger, fontSize: typography.sizes.md, fontWeight: typography.weights.bold }]}>
            ⚠️ Active Farm Alerts ({alerts.length})
          </Text>

          {alerts.slice(0, 3).map((al: any) => (
            <Card key={al._id} style={{ borderColor: al.severity === 'critical' ? colors.danger : colors.warning, marginVertical: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: al.severity === 'critical' ? colors.danger : colors.warning, fontWeight: '700', fontSize: 14 }}>
                    {al.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {al.message}
                  </Text>
                </View>

                <Button
                  title="Resolve"
                  variant="outline"
                  size="sm"
                  onPress={() => handleResolveAlert(al._id)}
                  style={{ marginLeft: 10 }}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Live Cards for all 5 Sheds */}
      <Text style={[styles.sectionTitle, { color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginTop: spacing.lg }]}>
        5 Sheds Flock Status
      </Text>

      <View style={styles.shedsGrid}>
        {sheds.map((shed: any) => {
          const batch = shed.currentBatch;
          return (
            <View key={shed.shedId} style={[styles.shedCol, isWide ? styles.colWide : isTablet ? styles.colTablet : styles.colMobile]}>
              <Card elevated style={{ borderColor: batch?.missingEntryWarning ? colors.warning : colors.border }}>
                {/* Shed Header */}
                <View style={styles.shedHeader}>
                  <View>
                    <Text style={{ color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.bold }}>
                      {shed.shedName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs }}>
                      Worker: {shed.workerName}
                    </Text>
                  </View>

                  <Badge
                    label={shed.status.toUpperCase()}
                    variant={shed.status === 'active' ? 'success' : shed.status === 'cleaning' ? 'warning' : 'neutral'}
                    size="sm"
                  />
                </View>

                {batch ? (
                  <View style={{ marginTop: 10 }}>
                    <View style={styles.badgeRow}>
                      <Badge label={`Day ${batch.ageInDays}`} variant="info" size="sm" />
                      {batch.missingEntryWarning ? (
                        <Badge label="MISSING TODAY" variant="warning" size="sm" />
                      ) : (
                        <Badge label="TODAY LOGGED" variant="success" size="sm" />
                      )}
                    </View>

                    <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 6 }}>
                      Flock: <Text style={{ fontWeight: '700', color: colors.text }}>{batch.batchNumber}</Text>
                    </Text>

                    <View style={[styles.shedMetricsGrid, { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 8, marginTop: 8 }]}>
                      <View style={styles.metricCell}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                          {batch.birdsRemaining?.toLocaleString()}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>Birds</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>
                          {batch.mortalityPercent}%
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>Mortality</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>
                          {batch.feedConsumedTodayKg || 0} kg
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>Feed Today</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={{ color: colors.secondary, fontWeight: '700', fontSize: 15 }}>
                          {batch.fcrEstimate || '-'}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>Est. FCR</Text>
                      </View>
                    </View>

                    <Button
                      title="View Shed Details"
                      variant="outline"
                      size="sm"
                      onPress={() => router.push(`/(admin)/sheds/${shed.shedId}` as any)}
                      style={{ marginTop: 10 }}
                    />
                  </View>
                ) : (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
                      No active flock currently placed
                    </Text>
                    <Button
                      title="Place New Flock"
                      size="sm"
                      onPress={() => router.push('/(admin)/batches/create' as any)}
                    />
                  </View>
                )}
              </Card>
            </View>
          );
        })}
      </View>

      {/* Feed Stock Status Cards */}
      <Text style={[styles.sectionTitle, { color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginTop: spacing.lg }]}>
        Feed Stock Status
      </Text>

      <View style={styles.gridRow}>
        {feedStocks.map((stock: any) => {
          const isLow = stock.currentBags <= stock.reorderThresholdBags;
          return (
            <View key={stock.feedType} style={[styles.gridCol3, { padding: spacing.xs }]}>
              <Card elevated style={{ borderColor: isLow ? colors.danger : colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', textTransform: 'capitalize' }}>
                    {stock.feedType}
                  </Text>
                  <Badge label={isLow ? 'LOW STOCK' : 'OK'} variant={isLow ? 'danger' : 'success'} size="sm" />
                </View>
                <Text style={{ color: isLow ? colors.danger : colors.primary, fontSize: 24, fontWeight: '800', marginVertical: 4 }}>
                  {stock.currentBags} bags
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  = {stock.currentKg} kg • Threshold: {stock.reorderThresholdBags} bags
                </Text>
              </Card>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  heading: {},
  topActionButtons: {
    flexDirection: 'row',
    marginTop: 8
  },
  sectionTitle: {
    marginBottom: 8
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  gridCol4: {
    width: '25%',
    minWidth: 160
  },
  gridCol3: {
    width: '33.333%',
    minWidth: 200
  },
  shedsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6
  },
  shedCol: {
    padding: 6
  },
  colWide: {
    width: '33.333%'
  },
  colTablet: {
    width: '50%'
  },
  colMobile: {
    width: '100%'
  },
  shedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  shedMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricCell: {
    alignItems: 'center',
    flex: 1
  }
});
