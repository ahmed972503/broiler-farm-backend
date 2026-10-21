import { Response } from 'express';
import {
  FeedStock,
  FeedPurchase,
  FeedIssue,
  Expense,
  DailyRecord,
  Batch
} from '../models';
import { AuthRequest } from '../middleware/auth';
import { bagsToKg, roundTo } from '@broiler/shared';
import { logAuditEvent } from '../services/auditService';
import { AlertService } from '../services/alertService';

export class FeedController {
  static async getStock(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const stocks = await FeedStock.find();
      res.json({ success: true, data: stocks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createPurchase(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { supplier, date, invoiceNo, feedType, bags, bagWeightKg = 50, ratePerBag, paymentStatus = 'pending', amountPaid = 0, notes } = req.body;
      const totalKg = bagsToKg(bags, bagWeightKg);
      const totalAmount = roundTo(bags * ratePerBag, 2);
      const balanceAmount = roundTo(Math.max(0, totalAmount - amountPaid), 2);

      const purchase = await FeedPurchase.create({
        supplier,
        date,
        invoiceNo,
        feedType,
        bags,
        bagWeightKg,
        totalKg,
        ratePerBag,
        totalAmount,
        paymentStatus,
        amountPaid,
        balanceAmount,
        notes
      });

      // Update FeedStock
      await FeedStock.findOneAndUpdate(
        { feedType },
        {
          $inc: { currentBags: bags, currentKg: totalKg },
          $set: { bagWeightKg, lastUpdated: new Date() }
        },
        { upsert: true, new: true }
      );

      // Record Feed Purchase Expense
      await Expense.create({
        category: 'feed',
        amount: totalAmount,
        date,
        description: `Feed purchase: ${bags} bags (${feedType}) from ${supplier}`,
        paymentMethod: paymentStatus === 'paid' ? 'cash' : 'bank_transfer',
        paidTo: supplier,
        receiptNo: invoiceNo,
        createdBy: req.user!._id
      });

      await logAuditEvent({
        entityType: 'FeedPurchase',
        entityId: purchase._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: purchase.toObject()
      });

      AlertService.runAlertSweep().catch(e => console.error('Alert sweep error', e));

      res.status(201).json({ success: true, data: purchase });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createIssue(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { date, shedId, batchId, feedType, bags, bagWeightKg = 50, issuedTo, notes } = req.body;

      const batch = await Batch.findById(batchId);
      if (!batch || batch.status === 'closed') {
        res.status(400).json({ success: false, error: 'Active batch is required for feed issuance' });
        return;
      }

      const totalKg = bagsToKg(bags, bagWeightKg);

      const issue = await FeedIssue.create({
        date,
        shedId,
        batchId,
        feedType,
        bags,
        bagWeightKg,
        totalKg,
        issuedTo,
        issuedBy: req.user!._id,
        notes
      });

      // Deduct from stock
      await FeedStock.findOneAndUpdate(
        { feedType },
        {
          $inc: { currentBags: -bags, currentKg: -totalKg },
          $set: { lastUpdated: new Date() }
        }
      );

      await logAuditEvent({
        entityType: 'FeedIssue',
        entityId: issue._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: issue.toObject()
      });

      AlertService.runAlertSweep().catch(e => console.error('Alert sweep error', e));

      res.status(201).json({ success: true, data: issue });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getReconciliation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batchId = req.query.batchId as string;
      const query: any = {};
      if (batchId) query.batchId = batchId;

      const issues = await FeedIssue.find(query);
      const dailyRecords = await DailyRecord.find(query);

      const totalIssuedBags = issues.reduce((sum, i) => sum + i.bags, 0);
      const totalIssuedKg = issues.reduce((sum, i) => sum + i.totalKg, 0);

      const totalConsumedBags = dailyRecords.reduce((sum, r) => sum + r.feedUsedBags, 0);
      const totalConsumedKg = dailyRecords.reduce((sum, r) => sum + r.feedUsedKg, 0);

      const discrepancyBags = roundTo(totalIssuedBags - totalConsumedBags, 1);
      const discrepancyKg = roundTo(totalIssuedKg - totalConsumedKg, 1);

      res.json({
        success: true,
        data: {
          totalIssuedBags: roundTo(totalIssuedBags, 1),
          totalIssuedKg: roundTo(totalIssuedKg, 1),
          totalConsumedBags: roundTo(totalConsumedBags, 1),
          totalConsumedKg: roundTo(totalConsumedKg, 1),
          discrepancyBags,
          discrepancyKg,
          status: Math.abs(discrepancyBags) <= 2 ? 'balanced' : 'discrepancy_detected'
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
