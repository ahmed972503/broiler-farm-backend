import { Router } from "express";
import { VaccineController } from "../controllers/vaccineController";
import { authenticate } from "../middleware/auth";
import { requireAdmin, requireShedAccess } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import {
  CompleteVaccinationTaskSchema,
  CreateMedicineRecordSchema,
} from "@broiler/shared";

const router = Router();

router.use(authenticate);

// Templates
router.get("/templates", VaccineController.getTemplates);
router.post("/templates", requireAdmin, VaccineController.createTemplate);

// Tasks
router.get("/tasks", VaccineController.getTasks);
router.post(
  "/tasks/:id/complete",
  requireShedAccess,
  validateBody(CompleteVaccinationTaskSchema),
  VaccineController.completeTask,
);

// Medicine Records
router.get("/medicines", VaccineController.getMedicineRecords);
router.post(
  "/medicines",
  requireShedAccess,
  validateBody(CreateMedicineRecordSchema),
  VaccineController.createMedicineRecord,
);

export default router;
