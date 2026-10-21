import {
  Batch,
  DailyRecord,
  Expense,
  Sale,
  FeedPurchase,
  FeedIssue,
  Staff,
  Attendance,
  StaffAdvance,
  WeightRecord
} from '../models';
import {
  calculateBirdsRemaining,
  calculateMortalityPercent,
  calculateFCR,
  calculateCostPerKg,
  calculateBatchProfit,
  calculateLivabilityPercent,
  calculateEPEF,
  roundTo,
  calculateStaffWage
} from '@broiler/shared';

export class ReportService {
  /**
   * Generates comprehensive Batch Performance Report
   */
  static async getBatchReport(batchId: string) {
    const batch = await Batch.findById(batchId).populate('shedId');
    if (!batch) throw new Error('Batch not found');

    const dailyRecords = await DailyRecord.find({ batchId }).sort({ date: 1 });
    const weightRecords = await WeightRecord.find({ batchId }).sort({ ageInDays: 1 });
    const sales = await Sale.find({ batchId }).sort({ date: 1 });
    const expenses = await Expense.find({ batchId }).sort({ date: 1 });

    const totalMortality = dailyRecords.reduce((sum, r) => sum + r.mortalityCount, 0);
    const totalCulls = dailyRecords.reduce((sum, r) => sum + r.culls, 0);
    const totalFeedKg = dailyRecords.reduce((sum, r) => sum + r.feedUsedKg, 0);
    const totalBirdsSold = sales.reduce((sum, s) => sum + s.birdsSold, 0);
    const totalLiveWeightSoldKg = sales.reduce((sum, s) => sum + s.totalLiveWeightKg, 0);
    const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalBatchCost = expenses.reduce((sum, e) => sum + e.amount, 0);

    const birdsRemaining = calculateBirdsRemaining(batch.chicksPlaced, totalMortality, totalCulls, totalBirdsSold);
    const mortalityRate = calculateMortalityPercent(batch.chicksPlaced, totalMortality, false);
    const livability = calculateLivabilityPercent(batch.chicksPlaced, birdsRemaining, totalBirdsSold);
    const fcr = calculateFCR(totalFeedKg, totalLiveWeightSoldKg);
    const costPerKg = calculateCostPerKg(totalBatchCost, totalLiveWeightSoldKg);
    const netProfit = calculateBatchProfit(totalSalesRevenue, totalBatchCost);

    return {
      batch: {
        id: batch._id,
        batchNumber: batch.batchNumber,
        shedName: (batch.shedId as any)?.name || 'Shed',
        shedNumber: (batch.shedId as any)?.shedNumber || 1,
        chicksPlaced: batch.chicksPlaced,
        placementDate: batch.placementDate,
        expectedCloseDate: batch.expectedCloseDate,
        supplier: batch.supplier,
        breed: batch.breed,
        chickRate: batch.chickRate,
        status: batch.status,
        closedAt: batch.closedAt
      },
      metrics: {
        birdsRemaining,
        totalMortality,
        mortalityRate,
        totalCulls,
        totalFeedKg: roundTo(totalFeedKg, 2),
        totalBirdsSold,
        totalLiveWeightSoldKg: roundTo(totalLiveWeightSoldKg, 2),
        averageLiveWeightSoldKg: totalBirdsSold > 0 ? roundTo(totalLiveWeightSoldKg / totalBirdsSold, 3) : 0,
        fcr,
        totalBatchCost: roundTo(totalBatchCost, 2),
        costPerKg,
        totalSalesRevenue: roundTo(totalSalesRevenue, 2),
        netProfit,
        livability
      },
      dailyRecords,
      weightRecords,
      sales,
      expenses
    };
  }

  /**
   * Comparative Report across all 5 sheds
   */
  static async getShedComparisonReport() {
    const batches = await Batch.find({ status: 'active' }).populate('shedId');
    const shedData = [];

    for (const batch of batches) {
      const records = await DailyRecord.find({ batchId: batch._id });
      const weights = await WeightRecord.find({ batchId: batch._id }).sort({ ageInDays: -1 }).limit(1);
      const sales = await Sale.find({ batchId: batch._id });

      const mortality = records.reduce((sum, r) => sum + r.mortalityCount, 0);
      const culls = records.reduce((sum, r) => sum + r.culls, 0);
      const feedKg = records.reduce((sum, r) => sum + r.feedUsedKg, 0);
      const sold = sales.reduce((sum, s) => sum + s.birdsSold, 0);
      const remaining = calculateBirdsRemaining(batch.chicksPlaced, mortality, culls, sold);

      const placementDate = new Date(batch.placementDate);
      const today = new Date();
      const ageInDays = Math.max(1, Math.ceil((today.getTime() - placementDate.getTime()) / (1000 * 60 * 60 * 24)));

      const latestAvgWeightGrams = weights[0]?.averageWeightGrams || 0;
      const estimatedLiveWeightKg = (remaining * latestAvgWeightGrams) / 1000;
      const estimatedFcr = calculateFCR(feedKg, estimatedLiveWeightKg);

      shedData.push({
        shedNumber: (batch.shedId as any)?.shedNumber,
        shedName: (batch.shedId as any)?.name,
        batchNumber: batch.batchNumber,
        ageInDays,
        chicksPlaced: batch.chicksPlaced,
        birdsRemaining: remaining,
        cumulativeMortality: mortality,
        mortalityPercent: calculateMortalityPercent(batch.chicksPlaced, mortality, false),
        feedConsumedKg: roundTo(feedKg, 1),
        latestAvgWeightGrams,
        estimatedFcr
      });
    }

    return shedData.sort((a, b) => a.shedNumber - b.shedNumber);
  }

  /**
   * Feed Reconciliation Report (Purchases, Issues, and Consumed)
   */
  static async getFeedReport(startDate?: string, endDate?: string) {
    const dateQuery: any = {};
    if (startDate && endDate) {
      dateQuery.date = { $gte: startDate, $lte: endDate };
    }

    const purchases = await FeedPurchase.find(dateQuery).sort({ date: -1 });
    const issues = await FeedIssue.find(dateQuery).populate('shedId').sort({ date: -1 });
    const consumedRecords = await DailyRecord.find(dateQuery);

    const totalPurchasedKg = purchases.reduce((sum, p) => sum + p.totalKg, 0);
    const totalPurchasedAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalIssuedKg = issues.reduce((sum, i) => sum + i.totalKg, 0);
    const totalConsumedKg = consumedRecords.reduce((sum, r) => sum + r.feedUsedKg, 0);

    return {
      totalPurchasedKg: roundTo(totalPurchasedKg, 1),
      totalPurchasedAmount: roundTo(totalPurchasedAmount, 2),
      totalIssuedKg: roundTo(totalIssuedKg, 1),
      totalConsumedKg: roundTo(totalConsumedKg, 1),
      reconciliationDifferenceKg: roundTo(totalIssuedKg - totalConsumedKg, 1),
      purchases,
      issues
    };
  }

  /**
   * Expense Report categorized by Cost Center
   */
  static async getExpenseReport(batchId?: string, startDate?: string, endDate?: string) {
    const query: any = {};
    if (batchId) query.batchId = batchId;
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };

    const expenses = await Expense.find(query).sort({ date: -1 });

    const byCategory: Record<string, number> = {};
    let totalExpense = 0;

    for (const exp of expenses) {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
      totalExpense += exp.amount;
    }

    return {
      totalExpense: roundTo(totalExpense, 2),
      byCategory,
      expenses
    };
  }

  /**
   * Sales & Buyer Ledger Report
   */
  static async getSalesLedgerReport() {
    const sales = await Sale.find().sort({ date: -1 });

    const buyerMap: Record<string, { totalBilled: number; totalPaid: number; balance: number; salesCount: number }> = {};

    let grandTotalBilled = 0;
    let grandTotalPaid = 0;

    for (const sale of sales) {
      if (!buyerMap[sale.buyerName]) {
        buyerMap[sale.buyerName] = { totalBilled: 0, totalPaid: 0, balance: 0, salesCount: 0 };
      }
      buyerMap[sale.buyerName].totalBilled += sale.totalAmount;
      buyerMap[sale.buyerName].totalPaid += sale.amountPaid;
      buyerMap[sale.buyerName].balance += sale.balanceAmount;
      buyerMap[sale.buyerName].salesCount += 1;

      grandTotalBilled += sale.totalAmount;
      grandTotalPaid += sale.amountPaid;
    }

    return {
      grandTotalBilled: roundTo(grandTotalBilled, 2),
      grandTotalPaid: roundTo(grandTotalPaid, 2),
      grandTotalOutstanding: roundTo(grandTotalBilled - grandTotalPaid, 2),
      buyers: Object.entries(buyerMap).map(([buyerName, stats]) => ({
        buyerName,
        totalBilled: roundTo(stats.totalBilled, 2),
        totalPaid: roundTo(stats.totalPaid, 2),
        balance: roundTo(stats.balance, 2),
        salesCount: stats.salesCount
      })),
      sales
    };
  }

  /**
   * Staff Wages & Attendance Report
   */
  static async getStaffWagesReport(monthStr: string) {
    // monthStr format: "YYYY-MM"
    const staffList = await Staff.find({ status: 'active' });
    const reports = [];

    for (const staff of staffList) {
      const attendance = await Attendance.find({
        staffId: staff._id,
        date: { $regex: `^${monthStr}` }
      });

      const presentCount = attendance.filter(a => a.status === 'present').length;
      const halfDayCount = attendance.filter(a => a.status === 'half_day').length;
      const absentCount = attendance.filter(a => a.status === 'absent').length;
      const leaveCount = attendance.filter(a => a.status === 'leave').length;

      const advances = await StaffAdvance.find({
        staffId: staff._id,
        date: { $regex: `^${monthStr}` }
      });
      const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);

      const wageCalc = calculateStaffWage(staff.dailyWage, presentCount, halfDayCount, totalAdvances);

      reports.push({
        staffId: staff._id,
        name: staff.name,
        role: staff.role,
        dailyWage: staff.dailyWage,
        presentDays: presentCount,
        halfDays: halfDayCount,
        absentDays: absentCount,
        leaveDays: leaveCount,
        grossWage: wageCalc.grossWage,
        advancesDeducted: wageCalc.advanceDeductions,
        netPayable: wageCalc.netPayable
      });
    }

    return reports;
  }

  /**
   * Formats array of objects to CSV string
   */
  static convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers
        .map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
