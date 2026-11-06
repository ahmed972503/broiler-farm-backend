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

// Medicine Records & Daily Sheets
router.get("/medicines", VaccineController.getMedicineRecords);
router.get("/medicines/yesterday", VaccineController.getYesterdayMedicines);
router.get("/medicines/autocomplete-names", VaccineController.getAutocompleteNames);
router.get("/medicines/daily-sheet", VaccineController.getDailyMedicineSheet);
router.post(
  "/medicines/daily-sheet",
  requireShedAccess,
  VaccineController.createDailyMedicineSheet,
);
router.post(
  "/medicines",
  requireShedAccess,
  validateBody(CreateMedicineRecordSchema),
  VaccineController.createMedicineRecord,
);

export default router;
