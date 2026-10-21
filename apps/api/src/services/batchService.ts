import mongoose from 'mongoose';
import {
  Batch,
  Shed,
  DailyRecord,
  Sale,
  Expense,
  VaccinationTemplate,
  VaccinationTask,
  IBatch
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
  BatchCloseSummary
} from '@broiler/shared';
import { logAuditEvent } from './auditService';

export class BatchService {
  /**
   * Creates a new flock batch, verifies shed availability, and seeds vaccination tasks
   */
  static async createBatch(params: {
    batchNumber: string;
    shedId: string;
    chicksPlaced: number;
    placementDate: string;
    expectedCloseDate: string;
    supplier: string;
    breed: string;
    chickRate: number;
    userId: string;
  }): Promise<IBatch> {
    const shed = await Shed.findById(params.shedId);
    if (!shed) {
      throw new Error('Specified shed does not exist');
    }

    // Verify no currently active batch exists for this shed
    const activeBatch = await Batch.findOne({ shedId: params.shedId, status: 'active' });
    if (activeBatch) {
      throw new Error(`Shed ${shed.shedNumber} already has an active flock (${activeBatch.batchNumber}). Please close it before placing new chicks.`);
    }

    const initialCost = roundTo(params.chicksPlaced * params.chickRate, 2);

    const batch = await Batch.create({
      batchNumber: params.batchNumber,
      shedId: new mongoose.Types.ObjectId(params.shedId),
      chicksPlaced: params.chicksPlaced,
      placementDate: params.placementDate,
      expectedCloseDate: params.expectedCloseDate,
      supplier: params.supplier,
      breed: params.breed || 'Cobb 500',
      chickRate: params.chickRate,
      initialCost,
      status: 'active'
    });

    // Update shed status and active pointer
    shed.status = 'active';
    shed.currentBatchId = batch._id as any;
    await shed.save();

    // Auto-generate vaccination tasks from standard template
    const template = (await VaccinationTemplate.findOne({ isDefault: true })) || (await VaccinationTemplate.findOne());
    if (template && template.schedule && template.schedule.length > 0) {
      const placement = new Date(params.placementDate);
      const tasksToCreate = template.schedule.map(item => {
        const dueDate = new Date(placement);
        dueDate.setDate(dueDate.getDate() + item.ageInDays);
        return {
          batchId: batch._id,
          shedId: batch.shedId,
          ageInDays: item.ageInDays,
          dueDate: dueDate.toISOString().split('T')[0],
          vaccineName: item.vaccineName,
          route: item.route,
          status: 'pending',
          notes: item.notes || ''
        };
      });
      await VaccinationTask.insertMany(tasksToCreate);
    }

    // Record initial chick expense automatically
    await Expense.create({
      batchId: batch._id,
      category: 'chicks',
      amount: initialCost,
      date: params.placementDate,
      description: `Chick placement purchase: ${params.chicksPlaced} chicks @ PKR ${params.chickRate} from ${params.supplier}`,
      paymentMethod: 'cash',
      paidTo: params.supplier,
      createdBy: new mongoose.Types.ObjectId(params.userId)
    });

    await logAuditEvent({
      entityType: 'Batch',
      entityId: batch._id.toString(),
      action: 'CREATE',
      performedBy: params.userId,
      newState: batch.toObject()
    });

    return batch;
  }

  /**
   * Closes a flock batch, calculating final FCR, Mortality, Costs, Sales, Profit, and EPEF
   */
  static async closeBatch(params: {
    batchId: string;
    closedAt: string;
    finalMortalityAdjustment?: number;
    finalCullsAdjustment?: number;
    notes?: string;
    userId: string;
  }): Promise<IBatch> {
    const batch = await Batch.findById(params.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    if (batch.status === 'closed') {
      throw new Error('Batch is already closed');
    }

    const previousState = batch.toObject();

    // 1. Gather all Daily Records
    const dailyRecords = await DailyRecord.find({ batchId: batch._id });
    let totalMortality = dailyRecords.reduce((sum, r) => sum + (r.mortalityCount || 0), 0) + (params.finalMortalityAdjustment || 0);
    let totalCulls = dailyRecords.reduce((sum, r) => sum + (r.culls || 0), 0) + (params.finalCullsAdjustment || 0);
    let totalFeedConsumedKg = dailyRecords.reduce((sum, r) => sum + (r.feedUsedKg || 0), 0);

    // 2. Gather all Sales
    const sales = await Sale.find({ batchId: batch._id });
    const totalBirdsSold = sales.reduce((sum, s) => sum + s.birdsSold, 0);
    const totalLiveWeightSoldKg = sales.reduce((sum, s) => sum + s.totalLiveWeightKg, 0);
    const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

    // 3. Gather all Batch Expenses
    const expenses = await Expense.find({ batchId: batch._id });
    const totalFeedCost = expenses.filter(e => e.category === 'feed').reduce((sum, e) => sum + e.amount, 0);
    const totalMedicineCost = expenses.filter(e => e.category === 'medicine').reduce((sum, e) => sum + e.amount, 0);
    const totalOtherExpenses = expenses.filter(e => e.category !== 'chicks' && e.category !== 'feed' && e.category !== 'medicine').reduce((sum, e) => sum + e.amount, 0);
    const totalBatchCost = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 4. Calculate Final Age in Days
    const placementDate = new Date(batch.placementDate);
    const closeDate = new Date(params.closedAt);
    const diffTime = Math.abs(closeDate.getTime() - placementDate.getTime());
    const finalAgeDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 5. Compute Business Metrics using pure formulas
    const birdsRemaining = calculateBirdsRemaining(batch.chicksPlaced, totalMortality, totalCulls, totalBirdsSold);
    const mortalityRatePercent = calculateMortalityPercent(batch.chicksPlaced, totalMortality, false);
    const livabilityPercent = calculateLivabilityPercent(batch.chicksPlaced, birdsRemaining, totalBirdsSold);
    const averageLiveWeightSoldKg = totalBirdsSold > 0 ? roundTo(totalLiveWeightSoldKg / totalBirdsSold, 3) : 0;
    const fcr = calculateFCR(totalFeedConsumedKg, totalLiveWeightSoldKg);
    const costPerKgSold = calculateCostPerKg(totalBatchCost, totalLiveWeightSoldKg);
    const netProfit = calculateBatchProfit(totalSalesRevenue, totalBatchCost);
    const epef = calculateEPEF(livabilityPercent, averageLiveWeightSoldKg, finalAgeDays, fcr);

    const closeSummary: BatchCloseSummary = {
      closedAt: params.closedAt,
      finalAgeDays,
      birdsPlaced: batch.chicksPlaced,
      birdsRemaining,
      totalMortality,
      mortalityRatePercent,
      totalCulls,
      totalBirdsSold,
      totalLiveWeightSoldKg: roundTo(totalLiveWeightSoldKg, 2),
      averageLiveWeightSoldKg,
      totalFeedConsumedKg: roundTo(totalFeedConsumedKg, 2),
      fcr,
      totalChickCost: batch.initialCost,
      totalFeedCost: roundTo(totalFeedCost, 2),
      totalMedicineCost: roundTo(totalMedicineCost, 2),
      totalOtherExpenses: roundTo(totalOtherExpenses, 2),
      totalBatchCost: roundTo(totalBatchCost, 2),
      costPerKgSold,
      totalSalesRevenue: roundTo(totalSalesRevenue, 2),
      netProfit,
      livabilityPercent,
      epef,
      notes: params.notes || ''
    };

    batch.status = 'closed';
    batch.closedAt = params.closedAt;
    batch.closeSummary = closeSummary;
    await batch.save();

    // Mark Shed as Cleaning
    const shed = await Shed.findById(batch.shedId);
    if (shed) {
      shed.status = 'cleaning';
      shed.currentBatchId = null;
      await shed.save();
    }

    await logAuditEvent({
      entityType: 'Batch',
      entityId: batch._id.toString(),
      action: 'UPDATE',
      performedBy: params.userId,
      previousState,
      newState: batch.toObject()
    });

    return batch;
  }
}
