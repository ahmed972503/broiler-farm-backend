import { Response } from 'express';
import { Staff, Attendance, StaffAdvance, Expense } from '../models';
import { AuthRequest } from '../middleware/auth';
import { calculateStaffWage } from '@broiler/shared';
import { logAuditEvent } from '../services/auditService';

export class StaffController {
  static async getStaff(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const staffList = await Staff.find().populate('assignedShedId', 'name shedNumber').sort({ name: 1 });
      res.json({ success: true, data: staffList });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createStaff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const staff = await Staff.create(req.body);
      await logAuditEvent({
        entityType: 'Staff',
        entityId: staff._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: staff.toObject()
      });
      res.status(201).json({ success: true, data: staff });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateStaff(req: AuthRequest, res: Response): Promise<void> {
    try {
      const staff = await Staff.findById(req.params.id);
      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }
      const previousState = staff.toObject();
      Object.assign(staff, req.body);
      await staff.save();

      await logAuditEvent({
        entityType: 'Staff',
        entityId: staff._id.toString(),
        action: 'UPDATE',
        performedBy: req.user!._id,
        previousState,
        newState: staff.toObject()
      });
      res.json({ success: true, data: staff });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async recordAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { staffId, date, status, notes } = req.body;
      const staff = await Staff.findById(staffId);
      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }

      let record = await Attendance.findOne({ staffId, date });
      if (!record) {
        record = await Attendance.create({
          staffId,
          date,
          status,
          dailyWageAmount: staff.dailyWage,
          notes,
          recordedBy: req.user!._id
        });
      } else {
        record.status = status;
        record.notes = notes || record.notes;
        await record.save();
      }

      res.status(200).json({ success: true, data: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.date) query.date = req.query.date;
      if (req.query.staffId) query.staffId = req.query.staffId;

      const records = await Attendance.find(query)
        .populate('staffId', 'name role dailyWage')
        .sort({ date: -1 });

      res.json({ success: true, data: records });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createAdvance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { staffId, date, amount, reason } = req.body;
      const staff = await Staff.findById(staffId);
      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }

      const advance = await StaffAdvance.create({
        staffId,
        date,
        amount,
        reason,
        status: 'pending'
      });

      // Record labour expense
      await Expense.create({
        category: 'labour',
        amount,
        date,
        description: `Staff wage advance paid to ${staff.name}: ${reason || 'N/A'}`,
        paymentMethod: 'cash',
        paidTo: staff.name,
        createdBy: req.user!._id
      });

      res.status(201).json({ success: true, data: advance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getWageSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const monthStr = (req.query.month as string) || new Date().toISOString().substring(0, 7);
      const staffList = await Staff.find({ status: 'active' });

      const summaries = await Promise.all(
        staffList.map(async staff => {
          const attendance = await Attendance.find({
            staffId: staff._id,
            date: { $regex: `^${monthStr}` }
          });

          const presentCount = attendance.filter(a => a.status === 'present').length;
          const halfDayCount = attendance.filter(a => a.status === 'half_day').length;
          const absentCount = attendance.filter(a => a.status === 'absent').length;
          const leaveCount = attendance.filter(a => a.status === 'leave').length;

          const advances = await StaffAdvance.find({
            staffId: staff._id,
            date: { $regex: `^${monthStr}` }
          });
          const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);

          const wage = calculateStaffWage(staff.dailyWage, presentCount, halfDayCount, totalAdvances);

          return {
            staffId: staff._id,
            staffName: staff.name,
            phone: staff.phone,
            role: staff.role,
            dailyWage: staff.dailyWage,
            presentDays: presentCount,
            halfDays: halfDayCount,
            absentDays: absentCount,
            leaveDays: leaveCount,
            grossWage: wage.grossWage,
            advancesDeducted: wage.advanceDeductions,
            netPayable: wage.netPayable
          };
        })
      );

      res.json({ success: true, month: monthStr, data: summaries });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
