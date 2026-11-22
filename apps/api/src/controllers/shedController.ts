import { Response } from "express";
import { Shed, Batch, DailyRecord } from "../models";
import { AuthRequest } from "../middleware/auth";
import { logAuditEvent } from "../services/auditService";
import { NeonShedRepository } from "../config/postgres";

export class ShedController {
  static async getAllSheds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const workerId = req.user?.role === "worker" ? (req.user.assignedShedId || req.user.id || req.user._id?.toString()) : undefined;

      const neonSheds = await NeonShedRepository.findAll(workerId);
      const todayStr = new Date().toISOString().split("T")[0];

      const enrichedSheds = await Promise.all(
        neonSheds.map(async (shed) => {
          let currentBatchInfo = null;
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

              const records = await DailyRecord.find({ batchId: batch._id });
              const totalMortality = records.reduce(
                (sum: number, r: any) => sum + (r.mortalityCount || 0),
                0,
              );
              const totalCulls = records.reduce((sum: number, r: any) => sum + (r.culls || 0), 0);
              const birdsRemaining = Math.max(
                0,
                (batch.chicksPlaced || 0) - totalMortality - totalCulls,
              );

              const todayRecord = records.find((r: any) => r.date === todayStr);

              currentBatchInfo = {
                id: batch._id,
                batchNumber: batch.batchNumber,
                ageInDays,
                chicksPlaced: batch.chicksPlaced,
                birdsRemaining,
                cumulativeMortality: totalMortality,
                hasEntryToday: !!todayRecord,
                todayFeedBags: todayRecord ? todayRecord.feedUsedBags : 0,
              };
            }
          }

          return {
            ...shed,
            currentBatch: currentBatchInfo,
          };
        }),
      );

      res.json({ success: true, data: enrichedSheds });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getShedById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const neonShed = await NeonShedRepository.findById(req.params.id);
      if (neonShed) {
        let activeBatch = null;
        if (neonShed.currentBatchId) {
          activeBatch = await Batch.findById(neonShed.currentBatchId);
        }
        res.json({
          success: true,
          data: {
            ...neonShed,
            activeBatch,
          },
        });
        return;
      }

      res.status(404).json({ success: false, error: "Shed not found" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createShed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const neonShed = await NeonShedRepository.create(req.body);
      res.status(201).json({ success: true, data: neonShed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateShed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const updatedNeon = await NeonShedRepository.update(req.params.id, req.body);
      if (updatedNeon) {
        res.json({ success: true, data: updatedNeon });
        return;
      }
      res.status(404).json({ success: false, error: "Shed not found" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
