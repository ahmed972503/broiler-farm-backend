import { Response } from "express";
import mongoose from "mongoose";
import { Shed, Batch, DailyRecord } from "../models";
import { AuthRequest } from "../middleware/auth";
import { logAuditEvent } from "../services/auditService";
import { NeonShedRepository } from "../config/postgres";

export class ShedController {
  static async getAllSheds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const workerId = req.user?.role === "worker" ? (req.user.assignedShedId || req.user.id || req.user._id?.toString()) : undefined;

      // 1. Check Neon PostgreSQL first
      try {
        const neonSheds = await NeonShedRepository.findAll(workerId);
        if (neonSheds.length > 0) {
          res.json({ success: true, data: neonSheds });
          return;
        }
      } catch (neonErr: any) {
        console.error("[Neon getAllSheds Error]:", neonErr.message);
      }

      // 2. Fallback to MongoDB ONLY IF connected (readyState === 1)
      if (mongoose.connection.readyState === 1) {
        const query: any = {};
        if (req.user?.role === "worker") {
          if (!req.user.assignedShedId) {
            res.json({ success: true, data: [] });
            return;
          }
          query._id = req.user.assignedShedId;
        }

        const sheds = await Shed.find(query)
          .populate("assignedWorkerId", "name phone username")
          .sort({ shedNumber: 1 });
        const todayStr = new Date().toISOString().split("T")[0];

        const enrichedSheds = await Promise.all(
          sheds.map(async (shed) => {
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
                  (sum, r) => sum + r.mortalityCount,
                  0,
                );
                const totalCulls = records.reduce((sum, r) => sum + r.culls, 0);
                const birdsRemaining = Math.max(
                  0,
                  batch.chicksPlaced - totalMortality - totalCulls,
                );

                const todayRecord = records.find((r) => r.date === todayStr);

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
              ...shed.toObject(),
              currentBatch: currentBatchInfo,
            };
          }),
        );

        res.json({ success: true, data: enrichedSheds });
        return;
      }

      res.json({ success: true, data: [] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getShedById(req: AuthRequest, res: Response): Promise<void> {
    try {
      // 1. Check Neon PostgreSQL first
      const neonShed = await NeonShedRepository.findById(req.params.id);
      if (neonShed) {
        res.json({
          success: true,
          data: {
            ...neonShed,
            activeBatch: null,
          },
        });
        return;
      }

      // 2. Fallback to MongoDB if connected
      if (mongoose.connection.readyState === 1) {
        const shed = await Shed.findById(req.params.id).populate(
          "assignedWorkerId",
          "name phone username",
        );
        if (!shed) {
          res.status(404).json({ success: false, error: "Shed not found" });
          return;
        }

        let activeBatch = null;
        if (shed.currentBatchId) {
          activeBatch = await Batch.findById(shed.currentBatchId);
        }

        res.json({
          success: true,
          data: {
            ...shed.toObject(),
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
      // 1. Create in Neon Postgres
      const neonShed = await NeonShedRepository.create(req.body);

      // 2. Also create in Mongo if connected
      if (mongoose.connection.readyState === 1) {
        try {
          await Shed.create(req.body);
        } catch (e) {}
      }

      res.status(201).json({ success: true, data: neonShed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateShed(req: AuthRequest, res: Response): Promise<void> {
    try {
      // 1. Update in Neon Postgres
      const updatedNeon = await NeonShedRepository.update(req.params.id, req.body);
      if (updatedNeon) {
        res.json({ success: true, data: updatedNeon });
        return;
      }

      // 2. Fallback to Mongo if connected
      if (mongoose.connection.readyState === 1) {
        const shed = await Shed.findById(req.params.id);
        if (!shed) {
          res.status(404).json({ success: false, error: "Shed not found" });
          return;
        }
        Object.assign(shed, req.body);
        await shed.save();
        res.json({ success: true, data: shed });
        return;
      }

      res.status(404).json({ success: false, error: "Shed not found" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
