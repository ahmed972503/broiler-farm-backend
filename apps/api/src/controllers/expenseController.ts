import { Response } from 'express';
import { Expense } from '../models';
import { AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/auditService';

export class ExpenseController {
  static async getExpenses(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.batchId) query.batchId = req.query.batchId;
      if (req.query.category) query.category = req.query.category;
      if (req.query.startDate && req.query.endDate) {
        query.date = { $gte: req.query.startDate, $lte: req.query.endDate };
      }

      const expenses = await Expense.find(query)
        .populate('batchId', 'batchNumber')
        .populate('createdBy', 'name username')
        .sort({ date: -1 });

      const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

      res.json({ success: true, data: expenses, totalAmount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createExpense(req: AuthRequest, res: Response): Promise<void> {
    try {
      const expense = await Expense.create({
        ...req.body,
        createdBy: req.user!._id
      });

      await logAuditEvent({
        entityType: 'Expense',
        entityId: expense._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: expense.toObject()
      });

      res.status(201).json({ success: true, data: expense });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async deleteExpense(req: AuthRequest, res: Response): Promise<void> {
    try {
      const expense = await Expense.findByIdAndDelete(req.params.id);
      if (!expense) {
        res.status(404).json({ success: false, error: 'Expense not found' });
        return;
      }
      await logAuditEvent({
        entityType: 'Expense',
        entityId: expense._id.toString(),
        action: 'DELETE',
        performedBy: req.user!._id,
        previousState: expense.toObject()
      });
      res.json({ success: true, message: 'Expense deleted' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
