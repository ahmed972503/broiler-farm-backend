import { Response } from 'express';
import { WeightRecord, Batch } from '../models';
import { AuthRequest } from '../middleware/auth';
import { compareWithTargetWeight } from '@broiler/shared';
import { logAuditEvent } from '../services/auditService';

export class WeightController {
  static async getWeights(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.batchId) query.batchId = req.query.batchId;
      if (req.query.shedId) query.shedId = req.query.shedId;

      if (req.user?.role === 'worker' && req.user.assignedShedId) {
        query.shedId = req.user.assignedShedId;
      }

      const records = await WeightRecord.find(query).sort({ ageInDays: 1 });
      res.json({ success: true, data: records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createWeight(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batch = await Batch.findById(req.body.batchId);
      if (!batch) {
        res.status(404).json({ success: false, error: 'Batch not found' });
        return;
      }

      const comparison = compareWithTargetWeight(req.body.ageInDays, req.body.averageWeightGrams);

      const record = await WeightRecord.create({
        ...req.body,
        targetWeightGrams: comparison.targetGrams,
        deviationGrams: comparison.deviationGrams,
        createdBy: req.user!._id
      });

      await logAuditEvent({
        entityType: 'WeightRecord',
        entityId: record._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: record.toObject()
      });

      res.status(201).json({
        success: true,
        data: {
          ...record.toObject(),
          performanceStatus: comparison.performanceStatus,
          deviationPercent: comparison.deviationPercent
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
