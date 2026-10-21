import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../src/theme';
import { Card, Badge, Button, Input } from '../../../src/components/ui';
import { apiFetch } from '../../../src/api/client';

export default function SalesScreen() {
  const { colors, typography, spacing } = useTheme();

  const [sales, setSales] = useState<any[]>([]);
  const [sheds, setSheds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Sale Form
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [selectedShedId, setSelectedShedId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [birdsSold, setBirdsSold] = useState('2000');
  const [totalLiveWeightKg, setTotalLiveWeightKg] = useState('4200');
  const [ratePerKg, setRatePerKg] = useState('390'); // Manually editable
  const [amountPaid, setAmountPaid] = useState('1000000');
  const [vehicleNo, setVehicleNo] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  // Payment installment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSaleId, setPaymentSaleId] = useState('');
  const [payBuyerName, setPayBuyerName] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  const loadData = async () => {
    try {
      const salesRes = await apiFetch('/api/sales');
      if (salesRes.success && salesRes.data) setSales(salesRes.data);

      const shedRes = await apiFetch('/api/sheds');
      if (shedRes.success && shedRes.data) {
        setSheds(shedRes.data);
        if (!selectedShedId && shedRes.data.length > 0) setSelectedShedId(shedRes.data[0]._id);
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
  }, []);

  const totalCalculated = (parseFloat(totalLiveWeightKg) || 0) * (parseFloat(ratePerKg) || 0);

  const handleCreateSale = async () => {
    const shed = sheds.find(s => s._id === selectedShedId);
    if (!shed?.currentBatch?._id && !shed?.currentBatchId) {
      Alert.alert('Error', 'Selected shed has no active batch to lift birds from.');
      return;
    }
    if (!buyerName.trim()) {
      Alert.alert('Required', 'Buyer name is required.');
      return;
    }

    setSubmittingSale(true);
    try {
      const res = await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          batchId: shed.currentBatch?._id || shed.currentBatchId,
          shedId: selectedShedId,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          date: new Date().toISOString().split('T')[0],
          birdsSold: parseInt(birdsSold, 10),
          totalLiveWeightKg: parseFloat(totalLiveWeightKg),
          ratePerKg: parseFloat(ratePerKg),
          amountPaid: parseFloat(amountPaid) || 0,
          vehicleNo: vehicleNo.trim()
        })
      });

      if (res.success) {
        Alert.alert('Sale Invoiced', 'Bird sale recorded and buyer balance ledger updated.');
        setShowSaleForm(false);
        loadData();
      } else {
        Alert.alert('Error', res.error || 'Failed to save sale');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmittingSale(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      Alert.alert('Required', 'Please enter valid payment amount.');
      return;
    }

    setSubmittingPay(true);
    try {
      const res = await apiFetch('/api/sales/payment', {
        method: 'POST',
        body: JSON.stringify({
          saleId: paymentSaleId,
          buyerName: payBuyerName,
          date: new Date().toISOString().split('T')[0],
          amount: parseFloat(payAmount),
          paymentMethod: 'cash'
        })
      });

      if (res.success) {
        Alert.alert('Payment Logged', 'Buyer payment received and balance reduced.');
        setShowPaymentModal(false);
        setPayAmount('');
        loadData();
      } else {
        Alert.alert('Error', res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: spacing.base }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={{ color: colors.text, fontSize: typography.sizes.xl, fontWeight: typography.weights.heavy }}>
            Bird Sales & Buyer Ledger (Murghi Farokht)
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
            Invoicing with editable rate per kg, vehicle lifting, and installment receivables
          </Text>
        </View>

        <Button
          title={showSaleForm ? 'Cancel' : '+ New Bird Sale'}
          size="sm"
          onPress={() => setShowSaleForm(!showSaleForm)}
        />
      </View>

      {/* Sale Form */}
      {showSaleForm ? (
        <Card elevated style={{ borderColor: colors.primary, marginVertical: 10 }}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
            Record Broiler Bird Sale
          </Text>

          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Select Shed to Lift From:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {sheds.map(s => (
              <TouchableOpacity
                key={s._id}
                onPress={() => setSelectedShedId(s._id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedShedId === s._id ? colors.primary : colors.surface,
                    borderColor: selectedShedId === s._id ? colors.primary : colors.border
                  }
                ]}
              >
                <Text style={{ color: selectedShedId === s._id ? colors.white : colors.text, fontSize: 12, fontWeight: '600' }}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Buyer Name" placeholder="e.g. Haji Aslam Chicken Merchant" value={buyerName} onChangeText={setBuyerName} />
          <Input label="Buyer Phone" placeholder="0300-1234567" value={buyerPhone} onChangeText={setBuyerPhone} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 0.48 }}>
              <Input label="Birds Count" value={birdsSold} onChangeText={setBirdsSold} keyboardType="numeric" suffix="birds" />
            </View>
            <View style={{ flex: 0.48 }}>
              <Input label="Total Live Weight" value={totalLiveWeightKg} onChangeText={setTotalLiveWeightKg} keyboardType="decimal-pad" suffix="kg" />
            </View>
          </View>

          <Input
            label="Rate Per Kg (PKR - Manually Editable)"
            value={ratePerKg}
            onChangeText={setRatePerKg}
            keyboardType="decimal-pad"
            suffix="Rs./kg"
          />

          <View style={[styles.invoicePreview, { backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginVertical: 6 }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Total Invoiced Amount:</Text>
            <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '800' }}>
              Rs. {totalCalculated.toLocaleString()}
            </Text>
          </View>

          <Input label="Amount Paid Upfront" value={amountPaid} onChangeText={setAmountPaid} keyboardType="decimal-pad" suffix="Rs." />
          <Input label="Vehicle Number (Gaari No.)" placeholder="e.g. LES-1234" value={vehicleNo} onChangeText={setVehicleNo} />

          <Button title="Confirm Bird Sale" onPress={handleCreateSale} loading={submittingSale} />
        </Card>
      ) : null}

      {/* Payment Installment Modal */}
      {showPaymentModal ? (
        <Card elevated style={{ borderColor: colors.secondary, marginVertical: 10 }}>
          <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
            Record Payment Installment from {payBuyerName}
          </Text>
          <Input label="Installment Amount in PKR" placeholder="500000" value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" suffix="Rs." />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Button title="Cancel" variant="outline" onPress={() => setShowPaymentModal(false)} style={{ flex: 0.48 }} />
            <Button title="Save Payment" variant="secondary" onPress={handleRecordPayment} loading={submittingPay} style={{ flex: 0.48 }} />
          </View>
        </Card>
      ) : null}

      {/* Sales Invoices List */}
      <Text style={{ color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginTop: spacing.md, marginBottom: 8 }}>
        Sales Invoices ({sales.length})
      </Text>

      {sales.map(sale => (
        <Card key={sale._id} elevated style={{ marginVertical: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                {sale.buyerName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {sale.date} • {sale.birdsSold?.toLocaleString()} birds • {sale.totalLiveWeightKg?.toLocaleString()} kg @ Rs. {sale.ratePerKg}/kg
              </Text>
            </View>

            <Badge
              label={sale.paymentStatus.toUpperCase()}
              variant={sale.paymentStatus === 'paid' ? 'success' : sale.paymentStatus === 'partial' ? 'warning' : 'danger'}
            />
          </View>

          <View style={[styles.invoiceMetrics, { backgroundColor: colors.surface, borderRadius: 8, padding: 8, marginTop: 8 }]}>
            <View style={styles.cell}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Rs. {sale.totalAmount?.toLocaleString()}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>Total Billed</Text>
            </View>
            <View style={styles.cell}>
              <Text style={{ color: colors.success, fontWeight: '700', fontSize: 14 }}>Rs. {sale.amountPaid?.toLocaleString()}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>Paid</Text>
            </View>
            <View style={styles.cell}>
              <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 14 }}>Rs. {sale.balanceAmount?.toLocaleString()}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>Balance</Text>
            </View>
          </View>

          {sale.balanceAmount > 0 ? (
            <Button
              title="+ Receive Payment Installment"
              variant="outline"
              size="sm"
              onPress={() => {
                setPaymentSaleId(sale._id);
                setPayBuyerName(sale.buyerName);
                setShowPaymentModal(true);
              }}
              style={{ marginTop: 8 }}
            />
          ) : null}
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
    marginBottom: 10
  },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6
  },
  invoicePreview: {},
  invoiceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cell: {
    alignItems: 'center',
    flex: 1
  }
});
