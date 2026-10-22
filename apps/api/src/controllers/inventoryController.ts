import { Response } from "express";
import { InventoryItem } from "../models";
import { AuthRequest } from "../middleware/auth";
import { logAuditEvent } from "../services/auditService";
import { AlertService } from "../services/alertService";

export class InventoryController {
  static async getItems(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query: any = {};
      if (req.query.category) query.category = req.query.category;

      const items = await InventoryItem.find(query).sort({
        category: 1,
        name: 1,
      });
      res.json({ success: true, data: items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const item = await InventoryItem.create(req.body);
      await logAuditEvent({
        entityType: "InventoryItem",
        entityId: item._id.toString(),
        action: "CREATE",
        performedBy: req.user!._id,
        newState: item.toObject(),
      });
      AlertService.runAlertSweep().catch((e) => console.error(e));
      res.status(201).json({ success: true, data: item });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const item = await InventoryItem.findById(req.params.id);
      if (!item) {
        res
          .status(404)
          .json({ success: false, error: "Inventory item not found" });
        return;
      }
      const previousState = item.toObject();
      Object.assign(item, req.body);
      await item.save();

      await logAuditEvent({
        entityType: "InventoryItem",
        entityId: item._id.toString(),
        action: "UPDATE",
        performedBy: req.user!._id,
        previousState,
        newState: item.toObject(),
      });
      AlertService.runAlertSweep().catch((e) => console.error(e));
      res.json({ success: true, data: item });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async deleteItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const item = await InventoryItem.findByIdAndDelete(req.params.id);
      if (!item) {
        res
          .status(404)
          .json({ success: false, error: "Inventory item not found" });
        return;
      }
      await logAuditEvent({
        entityType: "InventoryItem",
        entityId: item._id.toString(),
        action: "DELETE",
        performedBy: req.user!._id,
        previousState: item.toObject(),
      });
      res.json({ success: true, message: "Item deleted" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
