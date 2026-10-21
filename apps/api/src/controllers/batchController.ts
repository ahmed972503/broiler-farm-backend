import { Response } from 'express';
import { Batch } from '../models';
import { AuthRequest } from '../middleware/auth';
import { BatchService } from '../services/batchService';

export class BatchController {
  static async getAllBatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.user?.role === 'worker') {
        if (!req.user.assignedShedId) {
          res.json({ success: true, data: [] });
          return;
        }
        query.shedId = req.user.assignedShedId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (req.query.shedId) {
        query.shedId = req.query.shedId;
      }

      const batches = await Batch.find(query).populate('shedId', 'name shedNumber').sort({ createdAt: -1 });
      res.json({ success: true, data: batches });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getBatchById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batch = await Batch.findById(req.params.id).populate('shedId', 'name shedNumber capacity');
      if (!batch) {
        res.status(404).json({ success: false, error: 'Batch not found' });
        return;
      }

      // Worker permission check
      if (req.user?.role === 'worker' && batch.shedId._id.toString() !== req.user.assignedShedId?.toString()) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not have access to this flock' });
        return;
      }

      res.json({ success: true, data: batch });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batch = await BatchService.createBatch({
        ...req.body,
        userId: req.user!._id.toString()
      });
      res.status(201).json({ success: true, data: batch });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async closeBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batch = await BatchService.closeBatch({
        batchId: req.params.id,
        closedAt: req.body.closedAt,
        finalMortalityAdjustment: req.body.finalMortalityAdjustment,
        finalCullsAdjustment: req.body.finalCullsAdjustment,
        notes: req.body.notes,
        userId: req.user!._id.toString()
      });
      res.json({ success: true, data: batch });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
