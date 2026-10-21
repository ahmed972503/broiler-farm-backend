import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../src/theme';
import { Card, Badge, Button, Input } from '../../../src/components/ui';
import { apiFetch } from '../../../src/api/client';
import { EXPENSE_CATEGORIES } from '@broiler/shared';

export default function ExpensesScreen() {
  const { colors, typography, spacing } = useTheme();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<string>('electricity');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'check'>('cash');
  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = async () => {
    try {
      const res = await apiFetch('/api/expenses');
      if (res.success && res.data) {
        setExpenses(res.data);
        const total = (res as any).totalAmount !== undefined 
          ? (res as any).totalAmount 
          : (res.data as any[]).reduce((sum, e) => sum + (e.amount || 0), 0);
        setTotalAmount(total);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleCreateExpense = async () => {
    if (!amount || parseFloat(amount) <= 0 || !description.trim()) {
      Alert.alert('Required', 'Please enter valid amount and description.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          date: new Date().toISOString().split('T')[0],
          description: description.trim(),
          paidTo: paidTo.trim(),
          paymentMethod
        })
      });

      if (res.success) {
        Alert.alert('Expense Recorded', 'Expense logged successfully.');
        setShowForm(false);
        setAmount('');
        setDescription('');
        setPaidTo('');
        loadExpenses();
      } else {
        Alert.alert('Error', res.error || 'Failed to save expense');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExpenses(); }} colors={[colors.primary]} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={{ color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy }}>
            Farm Expenses (Kharche)
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            Total Recorded: Rs. {totalAmount.toLocaleString()}
          </Text>
        </View>

        <Button
          title={showForm ? 'Cancel' : '+ Add Expense'}
          size="sm"
          onPress={() => setShowForm(!showForm)}
        />
      </View>

      {/* Add Expense Form */}
      {showForm ? (
        <Card elevated style={{ borderColor: colors.primary, marginVertical: 10 }}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
            Record Farm Expense
          </Text>

          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Category:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {EXPENSE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: category === cat ? colors.primary : colors.surface,
                    borderColor: category === cat ? colors.primary : colors.border
                  }
                ]}
              >
                <Text style={{ color: category === cat ? colors.white : colors.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
                  {cat.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Amount in PKR" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" suffix="Rs." />
          <Input label="Description (Tafseel)" placeholder="e.g. Monthly WAPDA Bill / Diesel generator fuel" value={description} onChangeText={setDescription} />
          <Input label="Paid To" placeholder="Recipient / Vendor name" value={paidTo} onChangeText={setPaidTo} />

          <Button title="Save Expense" onPress={handleCreateExpense} loading={submitting} />
        </Card>
      ) : null}

      {/* Expenses List */}
      {expenses.map(exp => (
        <Card key={exp._id} style={{ marginVertical: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                {exp.description}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                {exp.date} • {exp.category.toUpperCase()} • Paid via {exp.paymentMethod}
              </Text>
            </View>

            <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '800' }}>
              -Rs. {exp.amount.toLocaleString()}
            </Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  catChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6
  }
});
