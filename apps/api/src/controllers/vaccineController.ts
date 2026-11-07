import { Response } from "express";
import {
  VaccinationTemplate,
  VaccinationTask,
  MedicineRecord,
  DailyMedicineSheet,
  Expense,
  Batch,
} from "../models";
import { AuthRequest } from "../middleware/auth";
import { logAuditEvent } from "../services/auditService";
import { AlertService } from "../services/alertService";

export class VaccineController {
  // Templates
  static async getTemplates(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const templates = await VaccinationTemplate.find().sort({
        createdAt: -1,
      });
      res.json({ success: true, data: templates });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.body.isDefault) {
        await VaccinationTemplate.updateMany({}, { isDefault: false });
      }
      const template = await VaccinationTemplate.create(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Tasks
  static async getTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.batchId) query.batchId = req.query.batchId;
      if (req.query.shedId) query.shedId = req.query.shedId;
      if (req.query.status) query.status = req.query.status;

      if (req.user?.role === "worker" && req.user.assignedShedId) {
        query.shedId = req.user.assignedShedId;
      }

      const tasks = await VaccinationTask.find(query)
        .populate("completedBy", "name username")
        .sort({ dueDate: 1 });

      res.json({ success: true, data: tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async completeTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const task = await VaccinationTask.findById(req.params.id);
      if (!task) {
        res
          .status(404)
          .json({ success: false, error: "Vaccination task not found" });
        return;
      }

      task.status = "completed";
      task.completedAt =
        req.body.completedAt || new Date().toISOString().split("T")[0];
      task.completedBy = req.user!._id;
      if (req.body.notes) task.notes = req.body.notes;
      await task.save();

      await logAuditEvent({
        entityType: "VaccinationTask",
        entityId: task._id.toString(),
        action: "UPDATE",
        performedBy: req.user!._id,
        newState: task.toObject(),
      });

      AlertService.runAlertSweep().catch((e) =>
        console.error("Alert sweep error", e),
      );

      res.json({ success: true, data: task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Medicine
  static async getMedicineRecords(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const query: any = {};
      if (req.query.batchId) query.batchId = req.query.batchId;
      if (req.query.shedId) query.shedId = req.query.shedId;

      if (req.user?.role === "worker" && req.user.assignedShedId) {
        query.shedId = req.user.assignedShedId;
      }

      const records = await MedicineRecord.find(query).sort({ date: -1 });
      res.json({ success: true, data: records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createMedicineRecord(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const batch = await Batch.findById(req.body.batchId);
      if (!batch) {
        res.status(404).json({ success: false, error: "Batch not found" });
        return;
      }

      const treatmentDate = new Date(req.body.date);
      const withdrawalDays = req.body.withdrawalPeriodDays || 0;
      const withdrawalEndDate = new Date(treatmentDate);
      withdrawalEndDate.setDate(withdrawalEndDate.getDate() + withdrawalDays);
      const withdrawalEndStr = withdrawalEndDate.toISOString().split("T")[0];

      const record = await MedicineRecord.create({
        ...req.body,
        withdrawalEndDate: withdrawalEndStr,
        administeredBy: req.user!.name,
      });

      // Optionally record expense if cost is supplied
      if (req.body.cost && req.body.cost > 0) {
        await Expense.create({
          batchId: batch._id,
          category: "medicine",
          amount: req.body.cost,
          date: req.body.date,
          description: `Medicine administration: ${req.body.medicineName} for ${req.body.reason}`,
          paymentMethod: "cash",
          createdBy: req.user!._id,
        });
      }

      await logAuditEvent({
        entityType: "MedicineRecord",
        entityId: record._id.toString(),
        action: "CREATE",
        performedBy: req.user!._id,
        newState: record.toObject(),
      });

      res.status(201).json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * "Copy yesterday's list" (ditto feature) endpoint
   * Retrieves previous day's medicines for this batch/shed so worker can copy in 1 click
   */
  static async getYesterdayMedicines(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { batchId, shedId, date } = req.query as {
        batchId: string;
        shedId?: string;
        date?: string;
      };

      if (!batchId) {
        res.status(400).json({ success: false, error: "batchId is required" });
        return;
      }

      const targetDate = date || new Date().toISOString().split("T")[0];

      // Check DailyMedicineSheet first
      const priorSheet = await DailyMedicineSheet.findOne({
        batchId,
        ...(shedId ? { shedId } : {}),
        date: { $lt: targetDate },
      }).sort({ date: -1 });

      if (priorSheet && priorSheet.items && priorSheet.items.length > 0) {
        res.json({
          success: true,
          date: priorSheet.date,
          source: "daily_sheet",
          items: priorSheet.items,
        });
        return;
      }

      // Fallback to MedicineRecord collection
      const priorRecords = await MedicineRecord.find({
        batchId,
        ...(shedId ? { shedId } : {}),
        date: { $lt: targetDate },
      }).sort({ date: -1 });

      if (priorRecords.length > 0) {
        const latestDate = priorRecords[0].date;
        const latestDayRecords = priorRecords.filter(
          (r) => r.date === latestDate,
        );
        const items = latestDayRecords.map((r) => ({
          name: r.medicineName,
          category: r.category || (r.isVaccine ? "vaccine" : "supplement"),
          isVaccine: r.isVaccine || false,
          dosage: r.dosage,
          route: r.route,
          quantity: r.quantity,
          unit: r.unit,
          cost: r.cost,
          notes: r.reason,
        }));
        res.json({
          success: true,
          date: latestDate,
          source: "medicine_records",
          items,
        });
        return;
      }

      res.json({ success: true, date: null, items: [] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Autocomplete endpoint: returns distinct list of previously recorded medicine and vaccine names
   */
  static async getAutocompleteNames(
    _req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const medNames = await MedicineRecord.distinct("medicineName");
      const templateTasks = await VaccinationTemplate.find();
      const templateNames = templateTasks.flatMap((t) =>
        t.schedule.map((s) => s.vaccineName),
      );

      // Common broiler medications in Pakistan as sensible baseline
      const baselineCommon = [
        "Electrolytes + Vitamin C",
        "Enrofloxacin 10%",
        "Colistin Sulfate",
        "Amoxicillin 20%",
        "Tylosin Tartrate",
        "Doxycycline HCl",
        "Vitamin AD3E + E-Care",
        "Liver Tonic (Hepatoprotective)",
        "Acidifier (Formic + Propionic)",
        "Kidney Renalin / Antidote",
        "ND + IB Live Vaccine",
        "ND Lasota Clone 30",
        "IBD Gumboro Intermediate Plus",
        "ND Killed Injection (Subcutaneous)",
      ];

      const combined = Array.from(
        new Set([...baselineCommon, ...medNames, ...templateNames]),
      ).sort();

      res.json({ success: true, data: combined });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Multi-item Daily Medicine Sheet
   */
  static async createDailyMedicineSheet(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { batchId, shedId, date, items } = req.body;
      const batch = await Batch.findById(batchId);
      if (!batch) {
        res.status(404).json({ success: false, error: "Batch not found" });
        return;
      }

      const sheet = await DailyMedicineSheet.findOneAndUpdate(
        { batchId, date },
        {
          batchId,
          shedId,
          date,
          items,
          recordedBy: req.user!._id,
        },
        { upsert: true, new: true },
      );

      // Record any associated costs to Expenses
      const totalCost = items.reduce(
        (sum: number, it: any) => sum + (it.cost || 0),
        0,
      );
      if (totalCost > 0) {
        await Expense.create({
          batchId: batch._id,
          category: "medicine",
          amount: totalCost,
          date,
          description: `Daily medicine items administration (${items.length} items)`,
          paymentMethod: "cash",
          createdBy: req.user!._id,
        });
      }

      await logAuditEvent({
        entityType: "DailyMedicineSheet",
        entityId: sheet._id.toString(),
        action: "CREATE",
        performedBy: req.user!._id,
        newState: sheet.toObject(),
      });

      res.status(201).json({ success: true, data: sheet });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getDailyMedicineSheet(
    req: AuthRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { batchId, date } = req.query as { batchId: string; date: string };
      const sheet = await DailyMedicineSheet.findOne({
        batchId,
        date,
      }).populate("recordedBy", "name username");
      res.json({ success: true, data: sheet });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
