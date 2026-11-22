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
    shedId?: string;
    shedNumber?: number;
    batchId?: string;
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
    const settings = (await FarmSettings.findOne()) || {
      alertThresholds: {
        mortalitySpikePercentDaily: 1.0,
        mortalitySpikePercent3Day: 2.0,
        weeklyMortalityAlertPercent: 3.0,
        stockShortageAlert: true,
        missedShiftEntryAlert: true,
        lowFeedStockBags: 20,
        tempMinCelsius: 20.0,
        tempMaxCelsius: 34.0,
        medicineExpiryWarningDays: 30,
        paymentOverdueDays: 14,
      },
    };
    const thresholds = (settings as any).alertThresholds || {
      mortalitySpikePercentDaily: 1.0,
      weeklyMortalityAlertPercent: 3.0,
      stockShortageAlert: true,
      missedShiftEntryAlert: true,
      lowFeedStockBags: 20,
      tempMinCelsius: 20.0,
      tempMaxCelsius: 34.0,
      medicineExpiryWarningDays: 30,
      paymentOverdueDays: 14,
    };
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Check Active Batches for Missed Entries, Spikes, Weekly Mortality & Stock Shortages
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

        // A. Check Mortality Spike on today's record (default: 1.0% of live birds per 24h)
        const liveBirds = todayRecord.openingBirds || batch.chicksPlaced;
        const dailyMortalityPercent =
          (todayRecord.mortalityCount / liveBirds) * 100;
        const spikeThreshold = thresholds.mortalitySpikePercentDaily || 1.0;

        const currentShedId = ((batch.shedId as any)?._id || (batch.shedId as any)?.id || batch.shedId || "").toString();

        if (dailyMortalityPercent >= spikeThreshold) {
          await this.raiseAlert({
            type: "mortality_spike",
            severity: "critical",
            title: `Critical Mortality Spike: Shed ${shed?.shedNumber || ""}`,
            message: `Mortality in Shed ${shed?.shedNumber} reached ${todayRecord.mortalityCount} birds (${dailyMortalityPercent.toFixed(2)}%) today. Immediate veterinary inspection required.`,
            shedId: currentShedId,
            shedNumber: shed?.shedNumber,
            batchId: batch._id as any,
          });
        }

        // B. Check Weekly Mortality Alert (cumulative in past 7 days)
        const past7Records = await DailyRecord.find({
          batchId: batch._id,
        })
          .sort({ date: -1 })
          .limit(7);

        const past7Mortality = past7Records.reduce(
          (sum, r) => sum + (r.mortalityCount || 0),
          0,
        );
        const weeklyMortPercent = (past7Mortality / batch.chicksPlaced) * 100;
        const weeklyThreshold = thresholds.weeklyMortalityAlertPercent || 3.0;

        if (weeklyMortPercent >= weeklyThreshold) {
          await this.raiseAlert({
            type: "weekly_mortality_alert",
            severity: "warning",
            title: `High Weekly Mortality Alert: Shed ${shed?.shedNumber || ""}`,
            message: `7-day mortality in Shed ${shed?.shedNumber} reached ${past7Mortality} birds (${weeklyMortPercent.toFixed(2)}%). Investigate flock health.`,
            shedId: currentShedId,
            shedNumber: shed?.shedNumber,
            batchId: batch._id as any,
          });
        }

        // C. Check Shortage-in-Stock Alert
        if (todayRecord.hasFeedStockShortage) {
          await this.raiseAlert({
            type: "feed_shortage_alert",
            severity: "critical",
            title: `Feed Stock Shortage: Shed ${shed?.shedNumber || ""}`,
            message: `Daily stock reconciliation flagged a shortage of ${Math.abs(todayRecord.feedStockDiscrepancyBags)} bags in Shed ${shed?.shedNumber}. Physical stock does not match calculated balance.`,
            shedId: currentShedId,
            shedNumber: shed?.shedNumber,
            batchId: batch._id as any,
          });
        }

        // D. Check Day or Night Entry Missing Alert
        if (
          thresholds.missedShiftEntryAlert &&
          todayRecord.shift !== "full" &&
          (!todayRecord.feedUsedDayShiftBags ||
            !todayRecord.feedUsedNightShiftBags)
        ) {
          const missingShift = !todayRecord.feedUsedDayShiftBags
            ? "Day"
            : "Night";
          await this.raiseAlert({
            type: "missed_shift_entry",
            severity: "warning",
            title: `Missed ${missingShift} Shift Entry: Shed ${shed?.shedNumber || ""}`,
            message: `Shed ${shed?.shedNumber} is missing ${missingShift} shift log entries. Complete both Day and Night shift records.`,
            shedId: currentShedId,
            shedNumber: shed?.shedNumber,
            batchId: batch._id as any,
          });
        }

        // E. Check Abnormal Temperature
        if (
          todayRecord.minTemp < thresholds.tempMinCelsius ||
          todayRecord.maxTemp > thresholds.tempMaxCelsius
        ) {
          await this.raiseAlert({
            type: "abnormal_temp",
            severity: "warning",
            title: `Abnormal Temperature: Shed ${shed?.shedNumber || ""}`,
            message: `Shed ${shed?.shedNumber} temperature recorded Min ${todayRecord.minTemp}°C / Max ${todayRecord.maxTemp}°C outside optimal range (${thresholds.tempMinCelsius}°C - ${thresholds.tempMaxCelsius}°C).`,
            shedId: currentShedId,
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
        shedId: ((task.shedId as any)?._id || (task.shedId as any)?.id || task.shedId || "").toString(),
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
        message: `${med.name} (${med.quantity} ${med.unit}) ${isExpired ? "has expired" : "expires"} on ${med.expiryDate}. Safe disposal or prompt usage required.`,
      });
    }

    // 5. Check Overdue Buyer Receivables
    const overdueCutoff = new Date();
    overdueCutoff.setDate(
      overdueCutoff.getDate() - thresholds.paymentOverdueDays,
    );
    const overdueCutoffStr = overdueCutoff.toISOString().split("T")[0];

    const overdueSales = await Sale.find({
      paymentStatus: { $ne: "paid" },
      date: { $lte: overdueCutoffStr },
    });
    for (const sale of overdueSales) {
      await this.raiseAlert({
        type: "pending_payment",
        severity: "warning",
        title: `Payment Overdue: ${sale.buyerName}`,
        message: `${sale.buyerName} has an outstanding balance of PKR ${sale.balanceAmount.toLocaleString()} for sale on ${sale.date}.`,
        batchId: sale.batchId,
      });
    }
  }
}
