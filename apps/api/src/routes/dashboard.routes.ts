import { Router } from "express";
import { DashboardController } from "../controllers/dashboardController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", DashboardController.getAdminDashboard);

export default router;
