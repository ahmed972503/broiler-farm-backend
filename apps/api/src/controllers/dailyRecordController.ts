import { Response } from "express";
import { DailyRecord, Batch, Shed, FarmSettings } from "../models";
import { AuthRequest } from "../middleware/auth";
import {
  bagsToKg,
  calculateDailyRecordSummary,
  roundTo,
  HistoricalRegisterImportSchema,
} from "@broiler/shared";
import { logAuditEvent } from "../services/auditService";
import { AlertService } from "../services/alertService";

export class DailyRecordController {
  static async getDailyRecords(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.batchId) query.batchId = req.query.batchId;
      if (req.query.shedId) query.shedId = req.query.shedId;
      if (req.query.date) query.date = req.query.date;

      // Restrict worker to assigned shed
      if (req.user?.role === "worker") {
        if (!req.user.assignedShedId) {
          res.json({ success: true, data: [] });
          return;
        }
        query.shedId = req.user.assignedShedId;
      }

      const records = await DailyRecord.find(query)
        .populate("createdBy", "name username")
        .sort({ date: -1 });

      res.json({ success: true, data: records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getTodayRecord(req: AuthRequest, res: Response): Promise<void> {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const shedId = req.params.shedId || req.user?.assignedShedId?.toString();
      if (!shedId) {
        res.status(400).json({ success: false, error: "Shed ID required" });
        return;
      }

      const shed = await Shed.findById(shedId);
      if (!shed || !shed.currentBatchId) {
        res.json({
          success: true,
          data: null,
          message: "No active flock in shed",
        });
        return;
      }

      const record = await DailyRecord.findOne({
        batchId: shed.currentBatchId,
        date: todayStr,
      }).populate("createdBy", "name username");

      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createDailyRecord(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const batch = await Batch.findById(req.body.batchId);
      if (!batch) {
        res.status(404).json({ success: false, error: "Batch not found" });
        return;
      }
      if (batch.status === "closed") {
        res.status(400).json({
          success: false,
          error: "Cannot add daily records to a closed batch",
        });
        return;
      }

      // Worker boundary check
      if (
        req.user?.role === "worker" &&
        batch.shedId.toString() !== req.user.assignedShedId?.toString()
      ) {
        res.status(403).json({
          success: false,
          error: "Forbidden: You can only log records for your assigned shed",
        });
        return;
      }

      // Check existing record for this date
      const existing = await DailyRecord.findOne({
        batchId: batch._id,
        date: req.body.date,
      });

      // Shift Merging: if existing record exists and incoming request is a shift update (e.g. Day + Night from different workers)
      if (existing) {
        const isShiftMerge =
          (req.body.shift === "night" && existing.feedUsedDayShiftBags > 0) ||
          (req.body.feedUsedNightShiftBags &&
            req.body.feedUsedNightShiftBags > 0 &&
            !existing.feedUsedNightShiftBags) ||
          (req.body.shift === "day" && existing.feedUsedNightShiftBags > 0);

        if (isShiftMerge) {
          const mergedDayFeed =
            req.body.feedUsedDayShiftBags !== undefined &&
            req.body.feedUsedDayShiftBags > 0
              ? req.body.feedUsedDayShiftBags
              : existing.feedUsedDayShiftBags;

          const mergedNightFeed =
            req.body.feedUsedNightShiftBags !== undefined &&
            req.body.feedUsedNightShiftBags > 0
              ? req.body.feedUsedNightShiftBags
              : req.body.shift === "night" && req.body.feedUsedBags
                ? req.body.feedUsedBags
                : existing.feedUsedNightShiftBags;

          const mergedDayMort =
            req.body.mortalityDayShift !== undefined &&
            req.body.mortalityDayShift > 0
              ? req.body.mortalityDayShift
              : existing.mortalityDayShift;

          const mergedNightMort =
            req.body.mortalityNightShift !== undefined &&
            req.body.mortalityNightShift > 0
              ? req.body.mortalityNightShift
              : req.body.shift === "night" && req.body.mortalityCount
                ? req.body.mortalityCount
                : existing.mortalityNightShift;

          const summary = calculateDailyRecordSummary({
            openingFeedStockBags:
              req.body.openingFeedStockBags !== undefined
                ? req.body.openingFeedStockBags
                : existing.openingFeedStockBags,
            feedUsedDayShiftBags: mergedDayFeed,
            feedUsedNightShiftBags: mergedNightFeed,
            feedReceivedBags:
              req.body.feedReceivedBags !== undefined
                ? req.body.feedReceivedBags
                : existing.feedReceivedBags,
            feedTransferredOutBags:
              req.body.feedTransferredOutBags !== undefined
                ? req.body.feedTransferredOutBags
                : existing.feedTransferredOutBags,
            reportedClosingFeedStockBags:
              req.body.closingFeedStockBags !== undefined
                ? req.body.closingFeedStockBags
                : existing.closingFeedStockBags,
            openingBirds: existing.openingBirds || batch.chicksPlaced,
            mortalityDayShift: mergedDayMort,
            mortalityNightShift: mergedNightMort,
            culls:
              req.body.culls !== undefined ? req.body.culls : existing.culls,
            liftedBirds:
              req.body.liftedBirds !== undefined
                ? req.body.liftedBirds
                : existing.liftedBirds,
          });

          existing.feedUsedDayShiftBags = mergedDayFeed;
          existing.feedUsedNightShiftBags = mergedNightFeed;
          existing.feedUsed24hBags = summary.feedUsed24hBags;
          existing.feedUsedBags = summary.feedUsed24hBags;
          existing.feedUsedKg = summary.feedUsedKg;
          existing.closingFeedStockBags = summary.closingFeedStockBags;
          existing.feedStockDiscrepancyBags = summary.feedStockDiscrepancyBags;
          existing.hasFeedStockShortage = summary.hasFeedStockShortage;
          existing.mortalityDayShift = mergedDayMort;
          existing.mortalityNightShift = mergedNightMort;
          existing.mortality24h = summary.mortality24h;
          existing.mortalityCount = summary.mortality24h;
          existing.closingBirds = summary.closingBirds;
          existing.shift = "full";
          existing.updatedBy = req.user!._id;

          if (req.body.mortalityDayCause)
            existing.mortalityDayCause = req.body.mortalityDayCause;
          if (req.body.mortalityNightCause)
            existing.mortalityNightCause = req.body.mortalityNightCause;
          if (req.body.feedRemarks) existing.feedRemarks = req.body.feedRemarks;
          if (req.body.customColumnES !== undefined)
            existing.customColumnES = req.body.customColumnES;

          await existing.save();

          await logAuditEvent({
            entityType: "DailyRecord",
            entityId: existing._id.toString(),
            action: "UPDATE",
            performedBy: req.user!._id,
            newState: existing.toObject(),
          });

          res.json({
            success: true,
            data: existing,
            message: "Day and Night shift entries merged successfully",
          });
          return;
        }

        res.status(409).json({
          success: false,
          error:
            "Daily record for this date already exists. Please edit existing entry.",
        });
        return;
      }

      // Calculate age in days
      const placementDate = new Date(batch.placementDate);
      const recordDate = new Date(req.body.date);
      const diffTime = recordDate.getTime() - placementDate.getTime();
      const ageInDays = Math.max(
        0,
        Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
      );

      // Prior day cumulative totals
      const priorDayRecord = await DailyRecord.findOne({
        batchId: batch._id,
        date: { $lt: req.body.date },
      }).sort({ date: -1 });

      const prevCumFeed = priorDayRecord?.cumulativeFeedBags || 0;
      const prevCumMort = priorDayRecord?.cumulativeMortality || 0;
      const openingBirds =
        priorDayRecord?.closingBirds ||
        req.body.openingBirds ||
        batch.chicksPlaced;

      let feedDay = req.body.feedUsedDayShiftBags || 0;
      let feedNight = req.body.feedUsedNightShiftBags || 0;
      let mortDay = req.body.mortalityDayShift || 0;
      let mortNight = req.body.mortalityNightShift || 0;

      if (
        feedDay === 0 &&
        feedNight === 0 &&
        req.body.feedUsedBags &&
        req.body.feedUsedBags > 0
      ) {
        if (req.body.shift === "night") {
          feedNight = req.body.feedUsedBags;
        } else {
          feedDay = req.body.feedUsedBags;
        }
      }

      if (
        mortDay === 0 &&
        mortNight === 0 &&
        req.body.mortalityCount &&
        req.body.mortalityCount > 0
      ) {
        if (req.body.shift === "night") {
          mortNight = req.body.mortalityCount;
        } else {
          mortDay = req.body.mortalityCount;
        }
      }

      const summary = calculateDailyRecordSummary({
        openingFeedStockBags: req.body.openingFeedStockBags || 0,
        feedUsedDayShiftBags: feedDay,
        feedUsedNightShiftBags: feedNight,
        feedReceivedBags: req.body.feedReceivedBags || 0,
        feedTransferredOutBags: req.body.feedTransferredOutBags || 0,
        previousCumulativeFeedBags: prevCumFeed,
        reportedClosingFeedStockBags: req.body.closingFeedStockBags,
        openingBirds,
        mortalityDayShift: mortDay,
        mortalityNightShift: mortNight,
        previousCumulativeMortality: prevCumMort,
        culls: req.body.culls || 0,
        liftedBirds: req.body.liftedBirds || 0,
      });

      // Lock policy: if entry is for past date and created by worker, it defaults to locked
      const todayStr = new Date().toISOString().split("T")[0];
      const isPastDate = req.body.date < todayStr;
      const isLocked = isPastDate && req.user?.role !== "admin";

      const record = await DailyRecord.create({
        ...req.body,
        ageInDays,
        openingBirds,
        feedUsedDayShiftBags: feedDay,
        feedUsedNightShiftBags: feedNight,
        feedUsed24hBags: summary.feedUsed24hBags,
        feedUsedBags: summary.feedUsed24hBags,
        feedUsedKg:
          req.body.feedUsedKg !== undefined
            ? req.body.feedUsedKg
            : summary.feedUsedKg,
        cumulativeFeedBags: summary.cumulativeFeedBags,
        closingFeedStockBags: summary.closingFeedStockBags,
        feedStockDiscrepancyBags: summary.feedStockDiscrepancyBags,
        hasFeedStockShortage: summary.hasFeedStockShortage,
        mortalityDayShift: mortDay,
        mortalityNightShift: mortNight,
        mortality24h: summary.mortality24h,
        mortalityCount: summary.mortality24h,
        cumulativeMortality: summary.cumulativeMortality,
        closingBirds: summary.closingBirds,
        customColumnES:
          req.body.customColumnES !== undefined
            ? req.body.customColumnES
            : null,
        isLocked,
        createdBy: req.user!._id,
      });

      await logAuditEvent({
        entityType: "DailyRecord",
        entityId: record._id.toString(),
        action: "CREATE",
        performedBy: req.user!._id,
        newState: record.toObject(),
      });

      // Background alert sweep trigger
      AlertService.runAlertSweep().catch((e) => {
        if (process.env.NODE_ENV !== "test")
          console.error("Alert sweep error", e);
      });

      res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateDailyRecord(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const record = await DailyRecord.findById(req.params.id);
      if (!record) {
        res
          .status(404)
          .json({ success: false, error: "Daily record not found" });
        return;
      }

      // Check lock state
      if (record.isLocked && req.user?.role !== "admin") {
        res.status(403).json({
          success: false,
          error:
            "This daily record is locked. Only an admin can unlock it for modifications.",
        });
        return;
      }

      const previousState = record.toObject();

      let feedDay = record.feedUsedDayShiftBags || 0;
      let feedNight = record.feedUsedNightShiftBags || 0;
      let mortDay = record.mortalityDayShift || 0;
      let mortNight = record.mortalityNightShift || 0;

      if (req.body.feedUsedDayShiftBags !== undefined) {
        feedDay = req.body.feedUsedDayShiftBags;
      } else if (req.body.shift === "day") {
        feedDay = req.body.feedUsedBags || 0;
      } else if (req.body.shift === "night") {
        // do not overwrite day
      } else if (
        req.body.feedUsedBags !== undefined &&
        req.body.feedUsedNightShiftBags === undefined
      ) {
        if (feedNight === 0) {
          feedDay = req.body.feedUsedBags;
        } else {
          feedDay = Math.max(0, req.body.feedUsedBags - feedNight);
        }
      }

      if (req.body.feedUsedNightShiftBags !== undefined) {
        feedNight = req.body.feedUsedNightShiftBags;
      } else if (req.body.shift === "night") {
        feedNight = req.body.feedUsedBags || 0;
      }

      if (req.body.mortalityDayShift !== undefined) {
        mortDay = req.body.mortalityDayShift;
      } else if (req.body.shift === "day") {
        mortDay = req.body.mortalityCount || 0;
      } else if (req.body.shift === "night") {
        // do not overwrite day
      } else if (
        req.body.mortalityCount !== undefined &&
        req.body.mortalityNightShift === undefined
      ) {
        if (mortNight === 0) {
          mortDay = req.body.mortalityCount;
        } else {
          mortDay = Math.max(0, req.body.mortalityCount - mortNight);
        }
      }

      if (req.body.mortalityNightShift !== undefined) {
        mortNight = req.body.mortalityNightShift;
      } else if (req.body.shift === "night") {
        mortNight = req.body.mortalityCount || 0;
      }

      const summary = calculateDailyRecordSummary({
        openingFeedStockBags:
          req.body.openingFeedStockBags !== undefined
            ? req.body.openingFeedStockBags
            : record.openingFeedStockBags,
        feedUsedDayShiftBags: feedDay,
        feedUsedNightShiftBags: feedNight,
        feedReceivedBags:
          req.body.feedReceivedBags !== undefined
            ? req.body.feedReceivedBags
            : record.feedReceivedBags,
        feedTransferredOutBags:
          req.body.feedTransferredOutBags !== undefined
            ? req.body.feedTransferredOutBags
            : record.feedTransferredOutBags,
        reportedClosingFeedStockBags:
          req.body.closingFeedStockBags !== undefined
            ? req.body.closingFeedStockBags
            : record.closingFeedStockBags,
        openingBirds: record.openingBirds || 0,
        mortalityDayShift: mortDay,
        mortalityNightShift: mortNight,
        culls: req.body.culls !== undefined ? req.body.culls : record.culls,
        liftedBirds:
          req.body.liftedBirds !== undefined
            ? req.body.liftedBirds
            : record.liftedBirds,
      });

      Object.assign(record, req.body, {
        feedUsedDayShiftBags: feedDay,
        feedUsedNightShiftBags: feedNight,
        feedUsed24hBags: summary.feedUsed24hBags,
        feedUsedBags: summary.feedUsed24hBags,
        feedUsedKg:
          req.body.feedUsedKg !== undefined
            ? req.body.feedUsedKg
            : summary.feedUsedKg,
        closingFeedStockBags: summary.closingFeedStockBags,
        feedStockDiscrepancyBags: summary.feedStockDiscrepancyBags,
        hasFeedStockShortage: summary.hasFeedStockShortage,
        mortalityDayShift: mortDay,
        mortalityNightShift: mortNight,
        mortality24h: summary.mortality24h,
        mortalityCount: summary.mortality24h,
        closingBirds: summary.closingBirds,
        updatedBy: req.user!._id,
      });

      await record.save();

      await logAuditEvent({
        entityType: "DailyRecord",
        entityId: record._id.toString(),
        action: "UPDATE",
        performedBy: req.user!._id,
        previousState,
        newState: record.toObject(),
      });

      AlertService.runAlertSweep().catch((e) => {
        if (process.env.NODE_ENV !== "test") {
          console.error("Alert sweep error", e);
        }
      });

      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async unlockDailyRecord(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const record = await DailyRecord.findById(req.params.id);
      if (!record) {
        res
          .status(404)
          .json({ success: false, error: "Daily record not found" });
        return;
      }

      record.isLocked = false;
      await record.save();

      await logAuditEvent({
        entityType: "DailyRecord",
        entityId: record._id.toString(),
        action: "UNLOCK",
        performedBy: req.user!._id,
        newState: { reason: req.body.reason || "Admin unlocked" },
      });

      res.json({
        success: true,
        message: "Record unlocked successfully",
        data: record,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Historical CSV Import for past register rows with validation & error report
   */
  static async importHistoricalRegister(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const parsed = HistoricalRegisterImportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Validation failed on historical import payload",
          details: parsed.error.errors,
        });
        return;
      }

      const { batchId, shedId, rows } = parsed.data;
      const batch = await Batch.findById(batchId);
      if (!batch) {
        res.status(404).json({ success: false, error: "Batch not found" });
        return;
      }

      const errors: Array<{ row: number; date: string; message: string }> = [];
      let successCount = 0;
      let runningCumFeed = 0;
      let runningCumMort = 0;
      let currentBirds = batch.chicksPlaced;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const feed24h = row.feedUsedDayShiftBags + row.feedUsedNightShiftBags;
          const mort24h = row.mortalityDayShift + row.mortalityNightShift;
          runningCumFeed = roundTo(runningCumFeed + feed24h, 2);
          runningCumMort += mort24h;
          currentBirds = Math.max(
            0,
            currentBirds - mort24h - (row.culls || 0) - (row.liftedBirds || 0),
          );

          const summary = calculateDailyRecordSummary({
            openingFeedStockBags: row.openingFeedStockBags,
            feedUsedDayShiftBags: row.feedUsedDayShiftBags,
            feedUsedNightShiftBags: row.feedUsedNightShiftBags,
            feedReceivedBags: row.feedReceivedBags,
            feedTransferredOutBags: row.feedTransferredOutBags,
            reportedClosingFeedStockBags: row.closingFeedStockBags,
            openingBirds: row.openingBirds || currentBirds + mort24h,
            mortalityDayShift: row.mortalityDayShift,
            mortalityNightShift: row.mortalityNightShift,
            culls: row.culls,
            liftedBirds: row.liftedBirds,
          });

          await DailyRecord.findOneAndUpdate(
            { batchId, date: row.date },
            {
              batchId,
              shedId,
              date: row.date,
              ageInDays: row.dayNumber || i + 1,
              openingFeedStockBags: row.openingFeedStockBags,
              openingBirds: row.openingBirds || currentBirds + mort24h,
              feedUsedDayShiftBags: row.feedUsedDayShiftBags,
              feedUsedNightShiftBags: row.feedUsedNightShiftBags,
              feedUsed24hBags: summary.feedUsed24hBags,
              feedUsedBags: summary.feedUsed24hBags,
              feedUsedKg: summary.feedUsedKg,
              feedReceivedBags: row.feedReceivedBags,
              feedTransferredOutBags: row.feedTransferredOutBags,
              cumulativeFeedBags: runningCumFeed,
              closingFeedStockBags: summary.closingFeedStockBags,
              feedStockDiscrepancyBags: summary.feedStockDiscrepancyBags,
              hasFeedStockShortage: summary.hasFeedStockShortage,
              feedRemarks: row.feedRemarks || "",
              mortalityDayShift: row.mortalityDayShift,
              mortalityNightShift: row.mortalityNightShift,
              mortality24h: summary.mortality24h,
              mortalityCount: summary.mortality24h,
              cumulativeMortality: runningCumMort,
              closingBirds: currentBirds,
              culls: row.culls || 0,
              liftedBirds: row.liftedBirds || 0,
              customColumnES:
                row.customColumnES !== undefined ? row.customColumnES : null,
              createdBy: req.user!._id,
              isLocked: true, // past historical imports lock automatically
            },
            { upsert: true, new: true },
          );
          successCount++;
        } catch (rowErr: any) {
          errors.push({
            row: i + 1,
            date: row.date,
            message: rowErr.message || "Failed to import row",
          });
        }
      }

      await logAuditEvent({
        entityType: "DailyRecord",
        entityId: batchId,
        action: "CREATE",
        performedBy: req.user!._id,
        newState: { importedRows: successCount, errorsCount: errors.length },
      });

      res.json({
        success: errors.length === 0,
        importedCount: successCount,
        errorsCount: errors.length,
        errors,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
