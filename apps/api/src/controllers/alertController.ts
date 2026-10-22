import { Response } from "express";
import { Alert } from "../models";
import { AuthRequest } from "../middleware/auth";
import { AlertService } from "../services/alertService";

export class AlertController {
  static async getAlerts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.isResolved !== undefined) {
        query.isResolved = req.query.isResolved === "true";
      }
      if (req.query.severity) {
        query.severity = req.query.severity;
      }
      if (req.query.shedId) {
        query.shedId = req.query.shedId;
      }

      const alerts = await Alert.find(query).sort({ createdAt: -1 });
      res.json({ success: true, data: alerts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async resolveAlert(req: AuthRequest, res: Response): Promise<void> {
    try {
      const alert = await Alert.findById(req.params.id);
      if (!alert) {
        res.status(404).json({ success: false, error: "Alert not found" });
        return;
      }

      alert.isResolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = req.user!._id;
      await alert.save();

      res.json({ success: true, message: "Alert resolved", data: alert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async triggerSweep(_req: AuthRequest, res: Response): Promise<void> {
    try {
      await AlertService.runAlertSweep();
      const activeAlerts = await Alert.find({ isResolved: false });
      res.json({
        success: true,
        message: "Alert audit sweep completed",
        count: activeAlerts.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
