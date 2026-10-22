import { Response } from "express";
import {
  Shed,
  Batch,
  DailyRecord,
  Alert,
  VaccinationTask,
  FeedStock,
  Expense,
  Sale,
  WeightRecord,
} from "../models";
import { AuthRequest } from "../middleware/auth";
import {
  calculateBirdsRemaining,
  calculateMortalityPercent,
  calculateFCR,
  roundTo,
} from "@broiler/shared";

export class DashboardController {
  static async getAdminDashboard(
    _req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const sheds = await Shed.find()
        .populate("assignedWorkerId", "name phone")
        .sort({ shedNumber: 1 });

      // 1. Process 5 Sheds Live Cards
      const shedCards = await Promise.all(
        sheds.map(async (shed) => {
          let currentBatchData = null;

          if (shed.currentBatchId) {
            const batch = await Batch.findById(shed.currentBatchId);
            if (batch) {
              const placement = new Date(batch.placementDate);
              const today = new Date();
              const ageInDays = Math.max(
                1,
                Math.ceil(
                  (today.getTime() - placement.getTime()) /
                    (1000 * 60 * 60 * 24),
                ),
              );

              const allRecords = await DailyRecord.find({ batchId: batch._id });
              const cumulativeMortality = allRecords.reduce(
                (sum, r) => sum + r.mortalityCount,
                0,
              );
              const cumulativeCulls = allRecords.reduce(
                (sum, r) => sum + r.culls,
                0,
              );
              const birdsRemaining = calculateBirdsRemaining(
                batch.chicksPlaced,
                cumulativeMortality,
                cumulativeCulls,
                0,
              );
              const mortalityPercent = calculateMortalityPercent(
                batch.chicksPlaced,
                cumulativeMortality,
                false,
              );

              const todayRecord = allRecords.find((r) => r.date === todayStr);

              const latestWeightRecord = await WeightRecord.findOne({
                batchId: batch._id,
              }).sort({ ageInDays: -1 });

              const totalFeedConsumedKg = allRecords.reduce(
                (sum, r) => sum + r.feedUsedKg,
                0,
              );
              const latestWeightGrams =
                latestWeightRecord?.averageWeightGrams || 0;
              const liveWeightKg = (birdsRemaining * latestWeightGrams) / 1000;
              const fcrEstimate = calculateFCR(
                totalFeedConsumedKg,
                liveWeightKg,
              );

              currentBatchData = {
                batchId: batch._id.toString(),
                batchNumber: batch.batchNumber,
                ageInDays,
                chicksPlaced: batch.chicksPlaced,
                birdsRemaining,
                cumulativeMortality,
                mortalityPercent,
                feedConsumedTodayKg: todayRecord ? todayRecord.feedUsedKg : 0,
                waterConsumedTodayLiters: todayRecord
                  ? todayRecord.waterLiters
                  : 0,
                latestAvgWeightGrams: latestWeightGrams,
                fcrEstimate,
                lastEntryTime: todayRecord
                  ? (
                      todayRecord.updatedAt || todayRecord.createdAt
                    ).toISOString()
                  : undefined,
                hasEntryToday: !!todayRecord,
                missingEntryWarning: !todayRecord,
              };
            }
          }

          return {
            shedId: shed._id.toString(),
            shedName: shed.name,
            shedNumber: shed.shedNumber,
            status: shed.status,
            workerName: (shed.assignedWorkerId as any)?.name || "Admin",
            currentBatch: currentBatchData,
          };
        }),
      );

      // 2. Active Alerts
      const alerts = await Alert.find({ isResolved: false }).sort({
        severity: 1,
        createdAt: -1,
      });

      // 3. Pending / Due Vaccinations
      const pendingVaccinations = await VaccinationTask.find({
        status: "pending",
        dueDate: { $lte: todayStr },
      })
        .populate("shedId", "name shedNumber")
        .sort({ dueDate: 1 });

      // 4. Feed Stock Status
      const feedStocks = await FeedStock.find().sort({ feedType: 1 });

      // 5. Financial Quick Summary
      const allExpenses = await Expense.find();
      const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);

      const allSales = await Sale.find();
      const totalSalesRevenue = allSales.reduce(
        (sum, s) => sum + s.totalAmount,
        0,
      );
      const totalCashReceived = allSales.reduce(
        (sum, s) => sum + s.amountPaid,
        0,
      );
      const outstandingReceivables = allSales.reduce(
        (sum, s) => sum + s.balanceAmount,
        0,
      );
      const netFarmProfit = roundTo(totalSalesRevenue - totalExpenses, 2);

      // 6. 7-Day Trend Charts Data
      const past7Dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        past7Dates.push(d.toISOString().split("T")[0]);
      }

      const trendRecords = await DailyRecord.find({
        date: { $in: past7Dates },
      });
      const trendData = past7Dates.map((date) => {
        const dayRecords = trendRecords.filter((r) => r.date === date);
        const mortalityCount = dayRecords.reduce(
          (sum, r) => sum + r.mortalityCount,
          0,
        );
        const feedUsedKg = dayRecords.reduce((sum, r) => sum + r.feedUsedKg, 0);
        return {
          date,
          mortalityCount,
          feedUsedKg: roundTo(feedUsedKg, 1),
        };
      });

      res.json({
        success: true,
        data: {
          sheds: shedCards,
          alerts: {
            total: alerts.length,
            criticalCount: alerts.filter((a) => a.severity === "critical")
              .length,
            warningCount: alerts.filter((a) => a.severity === "warning").length,
            list: alerts,
          },
          pendingVaccinations,
          feedStocks,
          financials: {
            totalExpenses: roundTo(totalExpenses, 2),
            totalSalesRevenue: roundTo(totalSalesRevenue, 2),
            totalCashReceived: roundTo(totalCashReceived, 2),
            outstandingReceivables: roundTo(outstandingReceivables, 2),
            netFarmProfit,
          },
          trends: trendData,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
