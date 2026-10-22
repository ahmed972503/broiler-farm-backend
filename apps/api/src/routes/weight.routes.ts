import { Router } from "express";
import { WeightController } from "../controllers/weightController";
import { authenticate } from "../middleware/auth";
import { requireShedAccess } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { CreateWeightRecordSchema } from "@broiler/shared";

const router = Router();

router.use(authenticate);

router.get("/", WeightController.getWeights);
router.post(
  "/",
  requireShedAccess,
  validateBody(CreateWeightRecordSchema),
  WeightController.createWeight,
);

export default router;
