import { Response } from 'express';
import { Sale, BuyerPayment, Batch } from '../models';
import { AuthRequest } from '../middleware/auth';
import { roundTo } from '@broiler/shared';
import { logAuditEvent } from '../services/auditService';
import { AlertService } from '../services/alertService';

export class SaleController {
  static async getSales(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.batchId) query.batchId = req.query.batchId;
      if (req.query.shedId) query.shedId = req.query.shedId;
      if (req.query.buyerName) query.buyerName = req.query.buyerName;

      const sales = await Sale.find(query)
        .populate('batchId', 'batchNumber')
        .populate('shedId', 'name shedNumber')
        .populate('createdBy', 'name username')
        .sort({ date: -1 });

      res.json({ success: true, data: sales });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createSale(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        batchId,
        shedId,
        buyerName,
        buyerPhone,
        date,
        birdsSold,
        totalLiveWeightKg,
        ratePerKg,
        amountPaid = 0,
        vehicleNo,
        notes
      } = req.body;

      const batch = await Batch.findById(batchId);
      if (!batch) {
        res.status(404).json({ success: false, error: 'Batch not found' });
        return;
      }

      const averageWeightKg = roundTo(totalLiveWeightKg / birdsSold, 3);
      const totalAmount = roundTo(totalLiveWeightKg * ratePerKg, 2);
      const balanceAmount = roundTo(Math.max(0, totalAmount - amountPaid), 2);

      let paymentStatus: 'paid' | 'partial' | 'pending' = 'pending';
      if (balanceAmount === 0) {
        paymentStatus = 'paid';
      } else if (amountPaid > 0) {
        paymentStatus = 'partial';
      }

      const sale = await Sale.create({
        batchId,
        shedId,
        buyerName: buyerName.trim(),
        buyerPhone,
        date,
        birdsSold,
        totalLiveWeightKg,
        averageWeightKg,
        ratePerKg,
        totalAmount,
        amountPaid,
        balanceAmount,
        paymentStatus,
        vehicleNo,
        notes,
        createdBy: req.user!._id
      });

      // If initial payment was made, log a BuyerPayment
      if (amountPaid > 0) {
        await BuyerPayment.create({
          buyerName: buyerName.trim(),
          buyerPhone,
          saleId: sale._id,
          date,
          amount: amountPaid,
          paymentMethod: 'cash',
          notes: 'Down payment on bird lifting',
          receivedBy: req.user!._id
        });
      }

      await logAuditEvent({
        entityType: 'Sale',
        entityId: sale._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: sale.toObject()
      });

      AlertService.runAlertSweep().catch(e => console.error(e));

      res.status(201).json({ success: true, data: sale });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async recordBuyerPayment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { buyerName, buyerPhone, saleId, date, amount, paymentMethod = 'cash', receiptNo, notes } = req.body;

      const payment = await BuyerPayment.create({
        buyerName: buyerName.trim(),
        buyerPhone,
        saleId,
        date,
        amount,
        paymentMethod,
        receiptNo,
        notes,
        receivedBy: req.user!._id
      });

      // If saleId provided, update that sale's balance
      if (saleId) {
        const sale = await Sale.findById(saleId);
        if (sale) {
          sale.amountPaid = roundTo(sale.amountPaid + amount, 2);
          sale.balanceAmount = roundTo(Math.max(0, sale.totalAmount - sale.amountPaid), 2);
          sale.paymentStatus = sale.balanceAmount === 0 ? 'paid' : 'partial';
          await sale.save();
        }
      }

      await logAuditEvent({
        entityType: 'BuyerPayment',
        entityId: payment._id.toString(),
        action: 'CREATE',
        performedBy: req.user!._id,
        newState: payment.toObject()
      });

      AlertService.runAlertSweep().catch(e => console.error(e));

      res.status(201).json({ success: true, data: payment });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getBuyerLedger(req: AuthRequest, res: Response): Promise<void> {
    try {
      const buyerName = req.params.buyerName;
      const sales = await Sale.find({ buyerName: new RegExp(`^${buyerName}$`, 'i') }).sort({ date: -1 });
      const payments = await BuyerPayment.find({ buyerName: new RegExp(`^${buyerName}$`, 'i') }).sort({ date: -1 });

      const totalBilled = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = roundTo(totalBilled - totalPaid, 2);

      res.json({
        success: true,
        data: {
          buyerName,
          totalBilled: roundTo(totalBilled, 2),
          totalPaid: roundTo(totalPaid, 2),
          balance,
          sales,
          payments
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
