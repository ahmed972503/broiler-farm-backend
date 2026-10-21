import { Response } from 'express';
import { FarmSettings } from '../models';
import { AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/auditService';

export class SettingsController {
  static async getSettings(_req: AuthRequest, res: Response): Promise<void> {
    try {
      let settings = await FarmSettings.findOne();
      if (!settings) {
        settings = await FarmSettings.create({});
      }
      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      let settings = await FarmSettings.findOne();
      if (!settings) {
        settings = await FarmSettings.create(req.body);
      } else {
        const previousState = settings.toObject();
        Object.assign(settings, req.body);
        await settings.save();

        await logAuditEvent({
          entityType: 'FarmSettings',
          entityId: settings._id.toString(),
          action: 'UPDATE',
          performedBy: req.user!._id,
          previousState,
          newState: settings.toObject()
        });
      }

      res.json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
