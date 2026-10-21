import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Button, Card, Badge, Input, StatCard } from '../../src/components/ui';
import { apiFetch, API_BASE_URL } from '../../src/api/client';
import { OfflineStore } from '../../src/db/offlineStore';
import { useSyncStore } from '../../src/store/useSyncStore';
import { compareWithTargetWeight } from '@broiler/shared';
import { useTranslation } from 'react-i18next';

export default function WorkerWeightScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, token } = useAuthStore();
  const { syncWithServer } = useSyncStore();
  const { t } = useTranslation();

  const [weights, setWeights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form fields
  const [ageInDays, setAgeInDays] = useState('21');
  const [sampleSize, setSampleSize] = useState('50');
  const [avgWeightGrams, setAvgWeightGrams] = useState('1050');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const shedId = user?.assignedShedId || user?.shed?.id;

  const loadWeights = async () => {
    try {
      if (shedId) {
        const res = await apiFetch(`/api/weights?shedId=${shedId}`);
        if (res.success && res.data) {
          setWeights(res.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch weights', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeights();
  }, [shedId]);

  const currentAge = parseInt(ageInDays, 10) || 0;
  const currentAvgWeight = parseFloat(avgWeightGrams) || 0;
  const comparison = compareWithTargetWeight(currentAge, currentAvgWeight);

  const handleSaveWeight = async () => {
    if (!currentAvgWeight || currentAvgWeight <= 0) {
      Alert.alert('Required', 'Please enter a valid average weight in grams.');
      return;
    }

    setSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        batchId: user?.shed?.currentBatchId || 'batch-active',
        shedId,
        date: todayStr,
        ageInDays: currentAge,
        sampleSize: parseInt(sampleSize, 10) || 50,
        averageWeightGrams: currentAvgWeight,
        notes: notes.trim()
      };

      await OfflineStore.enqueueMutation('WEIGHT_RECORD', 'CREATE', payload);

      if (token && user) {
        syncWithServer(API_BASE_URL, token, user.id).catch(e => console.warn(e));
      }

      Alert.alert('Mehfooz Ho Gaya!', `Day ${currentAge} sample weight (${currentAvgWeight}g) saved.`);
      loadWeights();
      setNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save weight');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWeights(); }} colors={[colors.primary]} />}
    >
      <Text style={[styles.title, { color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold }]}>
        {t('worker.sampleWeight')}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm, marginBottom: spacing.md }}>
        Weekly sample weighing & Cobb 500 comparison
      </Text>

      {/* Entry Form */}
      <Card elevated>
        <Text style={{ color: colors.primary, fontSize: typography.sizes.md, fontWeight: typography.weights.bold, marginBottom: 12 }}>
          ⚖️ New Sample Weight Reading
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Flock Age (Din)"
              placeholder="21"
              value={ageInDays}
              onChangeText={setAgeInDays}
              keyboardType="numeric"
              suffix="days"
            />
          </View>
          <View style={{ flex: 0.48 }}>
            <Input
              label="Sample Size"
              placeholder="50"
              value={sampleSize}
              onChangeText={setSampleSize}
              keyboardType="numeric"
              suffix="birds"
            />
          </View>
        </View>

        <Input
          label="Average Weight (Ausat Wazan)"
          placeholder="1050"
          value={avgWeightGrams}
          onChangeText={setAvgWeightGrams}
          keyboardType="numeric"
          suffix="grams"
          inputStyle={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}
        />

        {/* Live Target Curve Comparison */}
        <View style={[styles.comparisonBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
              Cobb 500 Target at Day {currentAge}:
            </Text>
            <Text style={{ color: colors.text, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold }}>
              {comparison.targetGrams}g
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
              Deviation:
            </Text>
            <Badge
              label={`${comparison.deviationGrams >= 0 ? '+' : ''}${comparison.deviationGrams}g (${comparison.deviationPercent}%)`}
              variant={comparison.performanceStatus === 'above_target' ? 'success' : comparison.performanceStatus === 'on_target' ? 'info' : 'danger'}
              size="sm"
            />
          </View>
        </View>

        <Input
          label="Notes (Optional)"
          placeholder="Uniformity, crop fill, general vigor"
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title={submitting ? 'Mehfooz Ho Raha Hai...' : 'Save Sample Weight'}
          onPress={handleSaveWeight}
          loading={submitting}
          size="lg"
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {/* Historical Sample Weights */}
      <Text style={[styles.sectionHeader, { color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.bold, marginTop: spacing.lg }]}>
        Flock Growth History
      </Text>

      {weights.map((w, index) => (
        <Card key={w._id || index} style={{ marginVertical: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: typography.sizes.base, fontWeight: typography.weights.bold }}>
              Day {w.ageInDays} • {w.averageWeightGrams}g
            </Text>
            <Badge
              label={`Target: ${w.targetWeightGrams}g`}
              variant={w.deviationGrams >= 0 ? 'success' : 'warning'}
              size="sm"
            />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs, marginTop: 4 }}>
            Sample of {w.sampleSize} birds weighed on {w.date}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  },
  title: {},
  comparisonBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10
  },
  sectionHeader: {
    marginBottom: 8
  }
});
