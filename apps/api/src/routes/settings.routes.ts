import { Router } from "express";
import { SettingsController } from "../controllers/settingsController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { UpdateFarmSettingsSchema } from "@broiler/shared";

const router = Router();

router.use(authenticate);

router.get("/", SettingsController.getSettings);
router.put(
  "/",
  requireAdmin,
  validateBody(UpdateFarmSettingsSchema),
  SettingsController.updateSettings,
);

export default router;
