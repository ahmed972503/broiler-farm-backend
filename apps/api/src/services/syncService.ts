import mongoose from "mongoose";
import {
  DailyRecord,
  WeightRecord,
  VaccinationTask,
  MedicineRecord,
  DailyMedicineSheet,
  FeedIssue,
  FeedTransfer,
  Expense,
  Attendance,
  AuditLog,
  FeedStock,
  Batch,
  Sale,
} from "../models";
import {
  SyncPacketInput,
  SyncItemResult,
  bagsToKg,
  calculateDailyRecordSummary,
  calculateLiftingBirds,
} from "@broiler/shared";
import { logAuditEvent } from "./auditService";

export class SyncService {
  static async processSyncPacket(
    packet: SyncPacketInput,
    userId: string,
  ): Promise<SyncItemResult[]> {
    const results: SyncItemResult[] = [];

    for (const item of packet.items) {
      try {
        // 1. Idempotency Check: see if this clientMutationId was already processed
        const existingAudit = await AuditLog.findOne({
          action: "SYNC",
          "newState.clientMutationId": item.clientMutationId,
        });

        if (existingAudit) {
          results.push({
            clientMutationId: item.clientMutationId,
            serverId: existingAudit.entityId,
            status: "synced",
            message: "Already processed idempotently",
          });
          continue;
        }

        let serverId: string | undefined;

        switch (item.entityType) {
          case "DAILY_RECORD": {
            serverId = await this.handleDailyRecordSync(item, userId);
            break;
          }
          case "WEIGHT_RECORD": {
            serverId = await this.handleWeightRecordSync(item, userId);
            break;
          }
          case "VACCINATION_TASK": {
            serverId = await this.handleVaccinationTaskSync(item, userId);
            break;
          }
          case "MEDICINE_RECORD": {
            serverId = await this.handleMedicineRecordSync(item, userId);
            break;
          }
          case "DAILY_MEDICINE": {
            serverId = await this.handleDailyMedicineSheetSync(item, userId);
            break;
          }
          case "FEED_ISSUE": {
            serverId = await this.handleFeedIssueSync(item, userId);
            break;
          }
          case "FEED_TRANSFER": {
            serverId = await this.handleFeedTransferSync(item, userId);
            break;
          }
          case "EXPENSE": {
            serverId = await this.handleExpenseSync(item, userId);
            break;
          }
          case "ATTENDANCE": {
            serverId = await this.handleAttendanceSync(item, userId);
            break;
          }
          case "SALE": {
            serverId = await this.handleSaleSync(item, userId);
            break;
          }
          default:
            throw new Error(`Unsupported entity type: ${item.entityType}`);
        }

        // Record Audit log for sync item
        await logAuditEvent({
          entityType: item.entityType,
          entityId: serverId || item.clientMutationId,
          action: "SYNC",
          performedBy: userId,
          newState: {
            ...item.payload,
            clientMutationId: item.clientMutationId,
            clientTimestamp: item.clientTimestamp,
          },
        });

        results.push({
          clientMutationId: item.clientMutationId,
          serverId,
          status: "synced",
        });
      } catch (err: any) {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== "test") {
          console.error(`[Sync Item Error] ${item.clientMutationId}:`, err);
        }
        results.push({
          clientMutationId: item.clientMutationId,
          status: "error",
          message: err.message || "Failed to process sync mutation",
        });
      }
    }

    return results;
  }

  /**
   * Intelligently merges Day and Night shift records from different workers/devices
   * without overwriting earlier shifts!
   */
  private static async handleDailyRecordSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const batch = await Batch.findById(payload.batchId);
    if (!batch) throw new Error("Associated batch not found");

    let record = await DailyRecord.findOne({
      batchId: payload.batchId,
      date: payload.date,
    });

    if (!record) {
      // First entry for this date
      let feedDay = payload.feedUsedDayShiftBags || 0;
      let feedNight = payload.feedUsedNightShiftBags || 0;
      let mortDay = payload.mortalityDayShift || 0;
      let mortNight = payload.mortalityNightShift || 0;

      if (feedDay === 0 && feedNight === 0 && payload.feedUsedBags && payload.feedUsedBags > 0) {
        if (payload.shift === "night") {
          feedNight = payload.feedUsedBags;
        } else {
          feedDay = payload.feedUsedBags;
        }
      }

      if (mortDay === 0 && mortNight === 0 && payload.mortalityCount && payload.mortalityCount > 0) {
        if (payload.shift === "night") {
          mortNight = payload.mortalityCount;
        } else {
          mortDay = payload.mortalityCount;
        }
      }

      const summary = calculateDailyRecordSummary({
        openingFeedStockBags: payload.openingFeedStockBags || 0,
        feedUsedDayShiftBags: feedDay,
        feedUsedNightShiftBags: feedNight,
        feedReceivedBags: payload.feedReceivedBags || 0,
        feedTransferredOutBags: payload.feedTransferredOutBags || 0,
        reportedClosingFeedStockBags: payload.closingFeedStockBags,
        openingBirds: payload.openingBirds || batch.chicksPlaced,
        mortalityDayShift: mortDay,
        mortalityNightShift: mortNight,
        culls: payload.culls || 0,
        liftedBirds: payload.liftedBirds || 0,
      });

      const ageInDays =
        payload.ageInDays !== undefined
          ? payload.ageInDays
          : Math.max(
              0,
              Math.ceil(
                (new Date(payload.date).getTime() -
                  new Date(batch.placementDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            );

      record = await DailyRecord.create({
        ...payload,
        ageInDays,
        feedType: payload.feedType || "grower",
        culls: payload.culls || 0,
        feedUsedDayShiftBags: feedDay,
        feedUsedNightShiftBags: feedNight,
        feedUsed24hBags: summary.feedUsed24hBags,
        feedUsedBags: summary.feedUsed24hBags,
        feedUsedKg: payload.feedUsedKg !== undefined ? payload.feedUsedKg : summary.feedUsedKg,
        closingFeedStockBags: summary.closingFeedStockBags,
        feedStockDiscrepancyBags: summary.feedStockDiscrepancyBags,
        hasFeedStockShortage: summary.hasFeedStockShortage,
        mortalityDayShift: mortDay,
        mortalityNightShift: mortNight,
        mortality24h: summary.mortality24h,
        mortalityCount: summary.mortality24h,
        closingBirds: summary.closingBirds,
        customColumnES: payload.customColumnES !== undefined ? payload.customColumnES : null,
        createdBy: new mongoose.Types.ObjectId(userId),
        clientUpdatedAt: item.clientTimestamp,
      });
    } else {
      // Day & Night Merge Logic:
      let mergedDayFeed = record.feedUsedDayShiftBags || 0;
      let mergedNightFeed = record.feedUsedNightShiftBags || 0;
      let mergedDayMort = record.mortalityDayShift || 0;
      let mergedNightMort = record.mortalityNightShift || 0;

      if (payload.feedUsedDayShiftBags !== undefined) {
        mergedDayFeed = payload.feedUsedDayShiftBags;
      } else if (payload.shift !== "night" && payload.feedUsedBags !== undefined) {
        mergedDayFeed = payload.feedUsedBags;
      }

      if (payload.feedUsedNightShiftBags !== undefined) {
        mergedNightFeed = payload.feedUsedNightShiftBags;
      } else if (payload.shift === "night" && payload.feedUsedBags !== undefined) {
        mergedNightFeed = payload.feedUsedBags;
      }

      if (payload.mortalityDayShift !== undefined) {
        mergedDayMort = payload.mortalityDayShift;
      } else if (payload.shift !== "night" && payload.mortalityCount !== undefined) {
        mergedDayMort = payload.mortalityCount;
      }

      if (payload.mortalityNightShift !== undefined) {
        mergedNightMort = payload.mortalityNightShift;
      } else if (payload.shift === "night" && payload.mortalityCount !== undefined) {
        mergedNightMort = payload.mortalityCount;
      }

      const summary = calculateDailyRecordSummary({
        openingFeedStockBags: payload.openingFeedStockBags !== undefined ? payload.openingFeedStockBags : record.openingFeedStockBags,
        feedUsedDayShiftBags: mergedDayFeed,
        feedUsedNightShiftBags: mergedNightFeed,
        feedReceivedBags: payload.feedReceivedBags !== undefined ? payload.feedReceivedBags : record.feedReceivedBags,
        feedTransferredOutBags: payload.feedTransferredOutBags !== undefined ? payload.feedTransferredOutBags : record.feedTransferredOutBags,
        reportedClosingFeedStockBags: payload.closingFeedStockBags !== undefined ? payload.closingFeedStockBags : record.closingFeedStockBags,
        openingBirds: record.openingBirds || batch.chicksPlaced,
        mortalityDayShift: mergedDayMort,
        mortalityNightShift: mergedNightMort,
        culls: payload.culls !== undefined ? payload.culls : record.culls,
        liftedBirds: payload.liftedBirds !== undefined ? payload.liftedBirds : record.liftedBirds,
      });

      // Update merged record
      record.feedUsedDayShiftBags = mergedDayFeed;
      record.feedUsedNightShiftBags = mergedNightFeed;
      record.feedUsed24hBags = summary.feedUsed24hBags;
      record.feedUsedBags = summary.feedUsed24hBags;
      record.feedUsedKg = payload.feedUsedKg !== undefined ? payload.feedUsedKg : summary.feedUsedKg;
      record.closingFeedStockBags = summary.closingFeedStockBags;
      record.feedStockDiscrepancyBags = summary.feedStockDiscrepancyBags;
      record.hasFeedStockShortage = summary.hasFeedStockShortage;
      record.mortalityDayShift = mergedDayMort;
      record.mortalityNightShift = mergedNightMort;
      record.mortality24h = summary.mortality24h;
      record.mortalityCount = summary.mortality24h;
      record.closingBirds = summary.closingBirds;

      if (payload.mortalityDayCause) record.mortalityDayCause = payload.mortalityDayCause;
      if (payload.mortalityNightCause) record.mortalityNightCause = payload.mortalityNightCause;
      if (payload.feedRemarks) record.feedRemarks = payload.feedRemarks;
      if (payload.customColumnES !== undefined) record.customColumnES = payload.customColumnES;
      if (payload.waterLiters !== undefined) record.waterLiters = payload.waterLiters;
      if (payload.minTemp !== undefined) record.minTemp = payload.minTemp;
      if (payload.maxTemp !== undefined) record.maxTemp = payload.maxTemp;
      if (payload.litterCondition) record.litterCondition = payload.litterCondition;
      if (payload.notes) record.notes = payload.notes;

      record.shift = mergedDayFeed > 0 && mergedNightFeed > 0 ? "full" : payload.shift || record.shift;
      record.updatedBy = new mongoose.Types.ObjectId(userId);
      record.clientUpdatedAt = item.clientTimestamp;

      await record.save();
    }
    return record._id.toString();
  }

  private static async handleWeightRecordSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const target = payload.targetWeightGrams !== undefined ? payload.targetWeightGrams : 0;
    const deviation = payload.deviationGrams !== undefined ? payload.deviationGrams : 0;
    const ageInDays = payload.ageInDays !== undefined ? payload.ageInDays : 1;
    let record = payload.id ? await WeightRecord.findById(payload.id) : null;
    if (!record) {
      record = await WeightRecord.create({
        ...payload,
        ageInDays,
        targetWeightGrams: target,
        deviationGrams: deviation,
        createdBy: new mongoose.Types.ObjectId(userId),
        clientUpdatedAt: item.clientTimestamp,
      });
    } else {
      Object.assign(record, payload, { clientUpdatedAt: item.clientTimestamp });
      await record.save();
    }
    return record._id.toString();
  }

  private static async handleVaccinationTaskSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const task = await VaccinationTask.findById(payload.taskId || payload.id);
    if (!task) throw new Error("Vaccination task not found");

    task.status = payload.status || "completed";
    task.completedAt =
      payload.completedAt || new Date().toISOString().split("T")[0];
    task.completedBy = new mongoose.Types.ObjectId(userId);
    task.notes = payload.notes || task.notes;
    task.clientUpdatedAt = item.clientTimestamp;
    await task.save();
    return task._id.toString();
  }

  private static async handleMedicineRecordSync(
    item: any,
    _userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const record = await MedicineRecord.create({
      ...payload,
      clientUpdatedAt: item.clientTimestamp,
    });
    return record._id.toString();
  }

  private static async handleDailyMedicineSheetSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    let sheet = await DailyMedicineSheet.findOne({
      batchId: payload.batchId,
      date: payload.date,
    });

    if (!sheet) {
      sheet = await DailyMedicineSheet.create({
        ...payload,
        recordedBy: new mongoose.Types.ObjectId(userId),
        clientUpdatedAt: item.clientTimestamp,
      });
    } else {
      sheet.items = payload.items || sheet.items;
      sheet.clientUpdatedAt = item.clientTimestamp;
      await sheet.save();
    }
    return sheet._id.toString();
  }

  private static async handleFeedIssueSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const bagWeightKg = payload.bagWeightKg || 50;
    const totalKg = payload.totalKg || payload.bags * bagWeightKg;

    const issue = await FeedIssue.create({
      ...payload,
      bagWeightKg,
      totalKg,
      issuedBy: new mongoose.Types.ObjectId(userId),
      clientUpdatedAt: item.clientTimestamp,
    });

    // Deduct from FeedStock
    await FeedStock.findOneAndUpdate(
      { feedType: payload.feedType },
      {
        $inc: { currentBags: -payload.bags, currentKg: -totalKg },
        $set: { lastUpdated: new Date() },
      },
    );

    return issue._id.toString();
  }

  private static async handleFeedTransferSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const brand = payload.brand || payload.feedBrand || "Star Feed";
    const transfer = await FeedTransfer.create({
      ...payload,
      brand,
      recordedBy: new mongoose.Types.ObjectId(userId),
      clientUpdatedAt: item.clientTimestamp,
    });

    // Adjust feed stock: transfer_in increases stock, transfer_out decreases stock
    const multiplier = payload.type === "transfer_in" ? 1 : -1;
    const bagWeightKg = payload.bagWeightKg || 50;
    const bagsDelta = payload.bags * multiplier;
    const kgDelta = bagsDelta * bagWeightKg;

    await FeedStock.findOneAndUpdate(
      { feedType: payload.feedType },
      {
        $inc: { currentBags: bagsDelta, currentKg: kgDelta },
        $set: { lastUpdated: new Date() },
      },
    );

    return transfer._id.toString();
  }

  private static async handleExpenseSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const expense = await Expense.create({
      ...payload,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    return expense._id.toString();
  }

  private static async handleAttendanceSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    let record = await Attendance.findOne({
      staffId: payload.staffId,
      date: payload.date,
    });
    if (!record) {
      record = await Attendance.create({
        ...payload,
        recordedBy: new mongoose.Types.ObjectId(userId),
        clientUpdatedAt: item.clientTimestamp,
      });
    } else {
      Object.assign(record, payload, { clientUpdatedAt: item.clientTimestamp });
      await record.save();
    }
    return record._id.toString();
  }

  private static async handleSaleSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const date = payload.date || payload.saleDate || new Date().toISOString().split("T")[0];
    const averageWeightKg = payload.averageWeightKg || (payload.birdsSold ? payload.totalLiveWeightKg / payload.birdsSold : 2.0);
    const liftingCalc = calculateLiftingBirds(
      payload.totalLiveWeightKg,
      averageWeightKg,
      payload.isManualBirdCountOverride ? payload.birdsSold : undefined,
      payload.overrideReason,
    );

    const birdsSold = payload.birdsSold || liftingCalc.birds;
    const totalAmount = payload.totalAmount || payload.totalLiveWeightKg * payload.ratePerKg;
    const amountPaid = payload.amountPaid || 0;
    const balanceAmount = totalAmount - amountPaid;

    const sale = await Sale.create({
      ...payload,
      date,
      averageWeightKg,
      birdsSold,
      totalAmount,
      balanceAmount,
      isManualBirdCountOverride: liftingCalc.isOverridden,
      overrideReason: liftingCalc.overrideReason || payload.overrideReason,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    return sale._id.toString();
  }
}
