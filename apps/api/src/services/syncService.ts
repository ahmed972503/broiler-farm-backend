import mongoose from "mongoose";
import {
  DailyRecord,
  WeightRecord,
  VaccinationTask,
  MedicineRecord,
  FeedIssue,
  Expense,
  Attendance,
  AuditLog,
  FeedStock,
  Batch,
} from "../models";
import { SyncPacketInput, SyncItemResult, bagsToKg } from "@broiler/shared";
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
          case "FEED_ISSUE": {
            serverId = await this.handleFeedIssueSync(item, userId);
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
        console.error(`[Sync Item Error] ${item.clientMutationId}:`, err);
        results.push({
          clientMutationId: item.clientMutationId,
          status: "error",
          message: err.message || "Failed to process sync mutation",
        });
      }
    }

    return results;
  }

  private static async handleDailyRecordSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    const batch = await Batch.findById(payload.batchId);
    if (!batch) throw new Error("Associated batch not found");

    const feedUsedKg =
      payload.feedUsedKg || bagsToKg(payload.feedUsedBags || 0);

    // Compound check: batchId + date
    let record = await DailyRecord.findOne({
      batchId: payload.batchId,
      date: payload.date,
    });
    if (!record) {
      record = await DailyRecord.create({
        ...payload,
        feedUsedKg,
        createdBy: new mongoose.Types.ObjectId(userId),
        clientUpdatedAt: item.clientTimestamp,
      });
    } else {
      // Last-Write-Wins based on timestamp
      if (
        !record.clientUpdatedAt ||
        new Date(item.clientTimestamp) >= new Date(record.clientUpdatedAt)
      ) {
        Object.assign(record, payload, {
          feedUsedKg,
          updatedBy: new mongoose.Types.ObjectId(userId),
          clientUpdatedAt: item.clientTimestamp,
        });
        await record.save();
      }
    }
    return record._id.toString();
  }

  private static async handleWeightRecordSync(
    item: any,
    userId: string,
  ): Promise<string> {
    const payload = item.payload;
    let record = payload.id ? await WeightRecord.findById(payload.id) : null;
    if (!record) {
      record = await WeightRecord.create({
        ...payload,
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
}
