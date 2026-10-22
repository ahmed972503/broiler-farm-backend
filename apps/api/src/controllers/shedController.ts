import { Response } from "express";
import { Shed, Batch, DailyRecord } from "../models";
import { AuthRequest } from "../middleware/auth";
import { logAuditEvent } from "../services/auditService";

export class ShedController {
  static async getAllSheds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      // If worker, restrict list to their assigned shed
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getShedById(req: AuthRequest, res: Response): Promise<void> {
    try {
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createShed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const shed = await Shed.create(req.body);
      await logAuditEvent({
        entityType: "Shed",
        entityId: shed._id.toString(),
        action: "CREATE",
        performedBy: req.user!._id,
        newState: shed.toObject(),
      });
      res.status(201).json({ success: true, data: shed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateShed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const shed = await Shed.findById(req.params.id);
      if (!shed) {
        res.status(404).json({ success: false, error: "Shed not found" });
        return;
      }
      const previousState = shed.toObject();
      Object.assign(shed, req.body);
      await shed.save();

      await logAuditEvent({
        entityType: "Shed",
        entityId: shed._id.toString(),
        action: "UPDATE",
        performedBy: req.user!._id,
        previousState,
        newState: shed.toObject(),
      });

      res.json({ success: true, data: shed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
