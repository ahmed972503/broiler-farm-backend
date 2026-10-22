import mongoose from "mongoose";
import {
  Alert,
  Batch,
  DailyRecord,
  VaccinationTask,
  FeedStock,
  InventoryItem,
  Sale,
  FarmSettings,
} from "../models";
import { AlertType, AlertSeverity } from "@broiler/shared";

export class AlertService {
  /**
   * Helper to create an alert if an identical active (unresolved) alert does not already exist
   */
  static async raiseAlert(params: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    shedId?: mongoose.Types.ObjectId;
    shedNumber?: number;
    batchId?: mongoose.Types.ObjectId;
  }): Promise<void> {
    const existing = await Alert.findOne({
      type: params.type,
      batchId: params.batchId,
      shedId: params.shedId,
      isResolved: false,
    });

    if (existing) {
      existing.message = params.message;
      existing.severity = params.severity;
      await existing.save();
      return;
    }

    await Alert.create({
      ...params,
      isResolved: false,
      createdAt: new Date(),
    });
  }

  /**
   * Runs the complete alert audit sweep across all active flocks and farm assets
   */
  static async runAlertSweep(): Promise<void> {
    if (mongoose.connection.readyState !== 1) {
      return;
    }
    const settings = (await FarmSettings.findOne()) || {
      alertThresholds: {
        mortalitySpikePercentDaily: 0.8,
        lowFeedStockBags: 20,
        tempMinCelsius: 20.0,
        tempMaxCelsius: 34.0,
        medicineExpiryWarningDays: 30,
        paymentOverdueDays: 14,
      },
    };
    const thresholds = settings.alertThresholds;
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Check Active Batches for Missed Daily Entries & Mortality Spikes
    const activeBatches = await Batch.find({ status: "active" }).populate(
      "shedId",
    );
    for (const batch of activeBatches) {
      const shed = batch.shedId as any;

      // Check today's daily record
      const todayRecord = await DailyRecord.findOne({
        batchId: batch._id,
        date: todayStr,
      });
      if (!todayRecord) {
        // Raise warning if missed entry
        await this.raiseAlert({
          type: "missed_daily_entry",
          severity: "warning",
          title: `Daily Record Missing: Shed ${shed?.shedNumber || ""}`,
          message: `Shed ${shed?.shedNumber || ""} (${batch.batchNumber}) has not submitted today's daily log.`,
          shedId: shed?._id || (batch.shedId as any),
          shedNumber: shed?.shedNumber,
          batchId: batch._id as any,
        });
      } else {
        // Resolve missed entry alert if record was created
        await Alert.updateMany(
          { type: "missed_daily_entry", batchId: batch._id, isResolved: false },
          { isResolved: true, resolvedAt: new Date() },
        );

        // Check Mortality Spike on today's record
        const dailyMortalityPercent =
          (todayRecord.mortalityCount / batch.chicksPlaced) * 100;
        if (dailyMortalityPercent >= thresholds.mortalitySpikePercentDaily) {
          await this.raiseAlert({
            type: "mortality_spike",
            severity: "critical",
            title: `Critical Mortality Spike: Shed ${shed?.shedNumber || ""}`,
            message: `Mortality in Shed ${shed?.shedNumber} reached ${todayRecord.mortalityCount} birds (${dailyMortalityPercent.toFixed(2)}%) today. Immediate veterinary inspection required.`,
            shedId: batch.shedId._id,
            shedNumber: shed?.shedNumber,
            batchId: batch._id as any,
          });
        }

        // Check Abnormal Temperature
        if (
          todayRecord.minTemp < thresholds.tempMinCelsius ||
          todayRecord.maxTemp > thresholds.tempMaxCelsius
        ) {
          await this.raiseAlert({
            type: "abnormal_temp",
            severity: "warning",
            title: `Abnormal Temperature: Shed ${shed?.shedNumber || ""}`,
            message: `Shed ${shed?.shedNumber} temperature recorded Min ${todayRecord.minTemp}°C / Max ${todayRecord.maxTemp}°C outside optimal range (${thresholds.tempMinCelsius}°C - ${thresholds.tempMaxCelsius}°C).`,
            shedId: batch.shedId._id,
            shedNumber: shed?.shedNumber,
            batchId: batch._id as any,
          });
        }
      }
    }

    // 2. Check Overdue & Due Vaccination Tasks
    const pendingVaccines = await VaccinationTask.find({
      dueDate: { $lte: todayStr },
      status: "pending",
    }).populate("shedId");

    for (const task of pendingVaccines) {
      const isOverdue = task.dueDate < todayStr;
      const shed = task.shedId as any;
      await this.raiseAlert({
        type: isOverdue ? "vaccine_overdue" : "vaccine_due",
        severity: isOverdue ? "critical" : "warning",
        title: isOverdue
          ? `Vaccine Overdue: ${task.vaccineName}`
          : `Vaccine Due Today: ${task.vaccineName}`,
        message: `Shed ${shed?.shedNumber || ""} requires ${task.vaccineName} (${task.route}). Due: ${task.dueDate}.`,
        shedId: task.shedId._id,
        shedNumber: shed?.shedNumber,
        batchId: task.batchId,
      });
    }

    // 3. Check Low Feed Stock
    const lowFeeds = await FeedStock.find({
      $expr: { $lte: ["$currentBags", "$reorderThresholdBags"] },
    });
    for (const feed of lowFeeds) {
      await this.raiseAlert({
        type: "low_feed_stock",
        severity: feed.currentBags <= 5 ? "critical" : "warning",
        title: `Low Feed Stock: ${feed.feedType.toUpperCase()}`,
        message: `${feed.feedType.toUpperCase()} feed stock is down to ${feed.currentBags} bags (Reorder threshold: ${feed.reorderThresholdBags} bags). Order fresh shipment.`,
      });
    }

    // 4. Check Medicine Expiry
    const expiryCutoff = new Date();
    expiryCutoff.setDate(
      expiryCutoff.getDate() + thresholds.medicineExpiryWarningDays,
    );
    const expiryCutoffStr = expiryCutoff.toISOString().split("T")[0];

    const expiringMeds = await InventoryItem.find({
      category: "medicine",
      expiryDate: { $ne: null, $lte: expiryCutoffStr },
    });
    for (const med of expiringMeds) {
      const isExpired = med.expiryDate! < todayStr;
      await this.raiseAlert({
        type: "medicine_near_expiry",
        severity: isExpired ? "critical" : "warning",
        title: isExpired
          ? `Medicine Expired: ${med.name}`
          : `Medicine Near Expiry: ${med.name}`,
        message: `${med.name} (${med.quantity} ${med.unit}) expires on ${med.expiryDate}.`,
      });
    }

    // 5. Check Pending Payments
    const overduePaymentCutoff = new Date();
    overduePaymentCutoff.setDate(
      overduePaymentCutoff.getDate() - thresholds.paymentOverdueDays,
    );
    const overdueCutoffStr = overduePaymentCutoff.toISOString().split("T")[0];

    const overdueSales = await Sale.find({
      paymentStatus: { $in: ["pending", "partial"] },
      date: { $lte: overdueCutoffStr },
    });
    for (const sale of overdueSales) {
      await this.raiseAlert({
        type: "pending_payment",
        severity: "warning",
        title: `Overdue Payment: ${sale.buyerName}`,
        message: `Buyer ${sale.buyerName} has an outstanding balance of PKR ${sale.balanceAmount.toLocaleString()} from sale on ${sale.date}.`,
      });
    }
  }
}
