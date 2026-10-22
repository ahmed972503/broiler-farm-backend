import { Router } from "express";
import { BatchController } from "../controllers/batchController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { CreateBatchSchema, CloseBatchSchema } from "@broiler/shared";

const router = Router();

router.use(authenticate);

router.get("/", BatchController.getAllBatches);
router.get("/:id", BatchController.getBatchById);
router.post(
  "/",
  requireAdmin,
  validateBody(CreateBatchSchema),
  BatchController.createBatch,
);
router.post(
  "/:id/close",
  requireAdmin,
  validateBody(CloseBatchSchema),
  BatchController.closeBatch,
);

export default router;
