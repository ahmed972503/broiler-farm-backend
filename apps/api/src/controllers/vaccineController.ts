import { Response } from "express";
import {
  VaccinationTemplate,
  VaccinationTask,
  MedicineRecord,
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
}
