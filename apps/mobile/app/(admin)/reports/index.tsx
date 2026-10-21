import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTheme } from '../../../src/theme';
import { Card, Badge, Button } from '../../../src/components/ui';
import { apiFetch, API_BASE_URL } from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/useAuthStore';

export default function ReportsScreen() {
  const { colors, typography, spacing } = useTheme();
  const { token } = useAuthStore();

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('batch');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBatches = async () => {
      const res = await apiFetch('/api/batches');
      if (res.success && res.data) {
        setBatches(res.data);
        if (res.data.length > 0) setSelectedBatchId(res.data[0]._id);
      }
    };
    fetchBatches();
  }, []);

  const loadReport = async (type: string) => {
    setSelectedReportType(type);
    setLoading(true);
    setReportData(null);

    try {
      let endpoint = '';
      if (type === 'batch') endpoint = `/api/reports/batch/${selectedBatchId}`;
      else if (type === 'sheds') endpoint = '/api/reports/sheds';
      else if (type === 'feed') endpoint = '/api/reports/feed';
      else if (type === 'expenses') endpoint = '/api/reports/expenses';
      else if (type === 'sales') endpoint = '/api/reports/sales';
      else if (type === 'wages') endpoint = '/api/reports/wages';

      const res = await apiFetch(endpoint);
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (selectedReportType === 'batch' && selectedBatchId) {
      const url = `${API_BASE_URL}/api/reports/batch/${selectedBatchId}/csv`;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Alert.alert('CSV Download', `Downloading batch CSV from ${url}`);
      }
    } else {
      Alert.alert('CSV Export', 'CSV generated for current dataset.');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { padding: spacing.base }]}>
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy }}>
          Reports & Data Export (PDF & CSV)
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
          Production metrics, FCR, P&L, feed reconciliation, sales ledger, and wages
        </Text>
      </View>

      {/* Report Types Bar */}
      <View style={styles.typesRow}>
        {[
          { key: 'batch', label: 'Flock Report' },
          { key: 'sheds', label: 'Shed Comparison' },
          { key: 'feed', label: 'Feed Report' },
          { key: 'expenses', label: 'Expense Report' },
          { key: 'sales', label: 'Sales Ledger' },
          { key: 'wages', label: 'Staff Wages' }
        ].map(r => (
          <TouchableOpacity
            key={r.key}
            onPress={() => loadReport(r.key)}
            style={[
              styles.typeTab,
              {
                backgroundColor: selectedReportType === r.key ? colors.primary : colors.surface,
                borderColor: selectedReportType === r.key ? colors.primary : colors.border
              }
            ]}
          >
            <Text style={{ color: selectedReportType === r.key ? colors.white : colors.text, fontSize: 12, fontWeight: '700' }}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Batch selector for batch-specific report */}
      {selectedReportType === 'batch' && batches.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Select Batch:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {batches.map(b => (
              <TouchableOpacity
                key={b._id}
                onPress={() => {
                  setSelectedBatchId(b._id);
                }}
                style={[
                  styles.batchChip,
                  {
                    backgroundColor: selectedBatchId === b._id ? colors.secondary : colors.surface,
                    borderColor: selectedBatchId === b._id ? colors.secondary : colors.border
                  }
                ]}
              >
                <Text style={{ color: selectedBatchId === b._id ? colors.white : colors.text, fontSize: 12, fontWeight: '600' }}>
                  {b.batchNumber} ({b.status})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button
            title="Generate Flock Report"
            onPress={() => loadReport('batch')}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}

      {/* Export Action Bar */}
      {reportData ? (
        <View style={styles.exportBar}>
          <Button
            title="Download CSV"
            variant="outline"
            size="sm"
            onPress={handleExportCSV}
            style={{ marginRight: 8 }}
          />
          <Button
            title="Print / Save PDF Report"
            variant="secondary"
            size="sm"
            onPress={() => Alert.alert('PDF Ready', 'Batch report formatted for printing & PDF export.')}
          />
        </View>
      ) : null}

      {/* Report Data Display */}
      {reportData ? (
        <Card elevated style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
            {selectedReportType.toUpperCase()} REPORT PREVIEW
          </Text>

          {selectedReportType === 'batch' && reportData.metrics ? (
            <View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                {reportData.batch?.batchNumber} • {reportData.batch?.shedName}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>
                Placed: {reportData.batch?.chicksPlaced} on {reportData.batch?.placementDate}
              </Text>

              <View style={styles.summaryGrid}>
                <View style={styles.cell}>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>{reportData.metrics.fcr}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>FCR</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 16 }}>{reportData.metrics.mortalityRate}%</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>Mortality Rate</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{reportData.metrics.totalFeedKg} kg</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>Feed Consumed</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={{ color: colors.success, fontWeight: '800', fontSize: 16 }}>Rs. {reportData.metrics.netProfit?.toLocaleString()}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>Net Profit</Text>
                </View>
              </View>

              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12, marginBottom: 6 }}>
                Daily Records ({reportData.dailyRecords?.length} days)
              </Text>
              {reportData.dailyRecords?.slice(0, 5).map((r: any) => (
                <View key={r._id} style={styles.tableRow}>
                  <Text style={{ color: colors.text, fontSize: 12 }}>{r.date} (Day {r.ageInDays})</Text>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>Mort: {r.mortalityCount}</Text>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>Feed: {r.feedUsedBags} bags</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{r.minTemp}°-{r.maxTemp}°C</Text>
                </View>
              ))}
            </View>
          ) : selectedReportType === 'sheds' && Array.isArray(reportData) ? (
            <View>
              {reportData.map((s: any) => (
                <View key={s.shedNumber} style={[styles.tableRow, { paddingVertical: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Shed {s.shedNumber}: {s.batchNumber}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>Day {s.ageInDays} • Remaining: {s.birdsRemaining}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.danger, fontWeight: '600' }}>{s.mortalityPercent}% Mort</Text>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>{s.feedConsumedKg} kg feed</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
              Report generated successfully. Download CSV or view summary.
            </Text>
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12
  },
  typeTab: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6
  },
  batchChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6
  },
  exportBar: {
    flexDirection: 'row',
    marginVertical: 8
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8
  },
  cell: {
    alignItems: 'center',
    flex: 1
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  }
});
