import { Response } from 'express';
import { DailyRecord, Batch, Shed } from '../models';
import { AuthRequest } from '../middleware/auth';
import { bagsToKg } from '@broiler/shared';
import { logAuditEvent } from '../services/auditService';
import { AlertService } from '../services/alertService';

export class DailyRecordController {
  static async getDailyRecords(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.batchId) query.batchId = req.query.batchId;
      if (req.query.shedId) query.shedId = req.query.shedId;
      if (req.query.date) query.date = req.query.date;

      // Restrict worker to assigned shed
      if (req.user?.role === 'worker') {
        if (!req.user.assignedShedId) {
          res.json({ success: true, data: [] });
          return;
        }
        query.shedId = req.user.assignedShedId;
      }

      const records = await DailyRecord.find(query)
        .populate('createdBy', 'name username')
        .sort({ date: -1 });

      res.json({ success: true, data: records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getTodayRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const shedId = req.params.shedId || req.user?.assignedShedId?.toString();
      if (!shedId) {
        res.status(400).json({ success: false, error: 'Shed ID required' });
        return;
      }

      const shed = await Shed.findById(shedId);
      if (!shed || !shed.currentBatchId) {
        res.json({ success: true, data: null, message: 'No active flock in shed' });
        return;
      }

      const record = await DailyRecord.findOne({
        batchId: shed.currentBatchId,
        date: todayStr
      }).populate('createdBy', 'name username');

      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createDailyRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batch = await Batch.findById(req.body.batchId);
      if (!batch) {
        res.status(404).json({ success: false, error: 'Batch not found' });
        return;
      }
      if (batch.status === 'closed') {
        res.status(400).json({ success: false, error: 'Cannot add daily records to a closed batch' });
        return;
      }

      // Worker boundary check
      if (req.user?.role === 'worker' && batch.shedId.toString() !== req.user.assignedShedId?.toString()) {
        res.status(403).json({ success: false, error: 'Forbidden: You can only log records for your assigned shed' });
        return;
      }

      // Check duplicate
      const existing = await DailyRecord.findOne({ batchId: batch._id, date: req.body.date });
      if (existing) {
        res.status(409).json({ success: false, error: 'Daily record for this date already exists. Please edit existing entry.' });
        return;
      }

      // Calculate age in days
      const placementDate = new Date(batch.placementDate);
      const recordDate = new Date(req.body.date);
      const diffTime = recordDate.getTime() - placementDate.getTime();
      const ageInDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const feedUsedKg = req.body.feedUsedKg || bagsToKg(req.body.feedUsedBags || 0);

      // Lock policy: if entry is for past date and created by worker, it defaults to locked
      const todayStr = new Date().toISOString().split('T')[0];
      const isPastDate = req.body.date < todayStr;
      const isLocked = isPastDate && req.user?.role !== 'admin';

      const record = await DailyRecord.create({
        ...req.body,
        ageInDays,
        feedUsedKg,
        isLocked,
        createdBy: req.user!._id
      });

      await logAuditEvent({
        entityType: 'DailyRecord',
        entityId: record._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: record.toObject()
      });

      // Background alert sweep trigger
      AlertService.runAlertSweep().catch(e => console.error('Alert sweep error', e));

      res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateDailyRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const record = await DailyRecord.findById(req.params.id);
      if (!record) {
        res.status(404).json({ success: false, error: 'Daily record not found' });
        return;
      }

      // Check lock state
      if (record.isLocked && req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'This daily record is locked. Only an admin can unlock it for modifications.'
        });
        return;
      }

      const previousState = record.toObject();

      if (req.body.feedUsedBags !== undefined && req.body.feedUsedKg === undefined) {
        req.body.feedUsedKg = bagsToKg(req.body.feedUsedBags);
      }

      Object.assign(record, req.body, { updatedBy: req.user!._id });
      await record.save();

      await logAuditEvent({
        entityType: 'DailyRecord',
        entityId: record._id.toString(),
        action: 'UPDATE',
        performedBy: req.user!._id,
        previousState,
        newState: record.toObject()
      });

      AlertService.runAlertSweep().catch(e => console.error('Alert sweep error', e));

      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async unlockDailyRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const record = await DailyRecord.findById(req.params.id);
      if (!record) {
        res.status(404).json({ success: false, error: 'Daily record not found' });
        return;
      }

      record.isLocked = false;
      await record.save();

      await logAuditEvent({
        entityType: 'DailyRecord',
        entityId: record._id.toString(),
        action: 'UNLOCK',
        performedBy: req.user!._id,
        newState: { reason: req.body.reason || 'Admin unlocked' }
      });

      res.json({ success: true, message: 'Record unlocked successfully', data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
