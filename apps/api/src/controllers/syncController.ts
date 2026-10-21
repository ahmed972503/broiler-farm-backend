import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SyncService } from '../services/syncService';
import { SyncResponse } from '@broiler/shared';

export class SyncController {
  static async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const packet = req.body;
      const userId = req.user!._id.toString();

      const results = await SyncService.processSyncPacket(packet, userId);

      const response: SyncResponse = {
        success: true,
        processedCount: results.length,
        results,
        serverTimestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Sync failed' });
    }
  }
}
