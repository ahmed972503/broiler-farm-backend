import { Router } from "express";
import { InventoryController } from "../controllers/inventoryController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { CreateInventoryItemSchema } from "@broiler/shared";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", InventoryController.getItems);
router.post(
  "/",
  validateBody(CreateInventoryItemSchema),
  InventoryController.createItem,
);
router.put("/:id", InventoryController.updateItem);
router.delete("/:id", InventoryController.deleteItem);

export default router;
