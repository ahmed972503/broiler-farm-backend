import { Router } from "express";
import authRoutes from "./auth.routes";
import shedRoutes from "./shed.routes";
import batchRoutes from "./batch.routes";
import dailyRecordRoutes from "./dailyRecord.routes";
import weightRoutes from "./weight.routes";
import vaccineRoutes from "./vaccine.routes";
import feedRoutes from "./feed.routes";
import inventoryRoutes from "./inventory.routes";
import expenseRoutes from "./expense.routes";
import saleRoutes from "./sale.routes";
import staffRoutes from "./staff.routes";
import dashboardRoutes from "./dashboard.routes";
import alertRoutes from "./alert.routes";
import reportRoutes from "./report.routes";
import settingsRoutes from "./settings.routes";
import syncRoutes from "./sync.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/sheds", shedRoutes);
router.use("/batches", batchRoutes);
router.use("/daily-records", dailyRecordRoutes);
router.use("/weights", weightRoutes);
router.use("/vaccinations", vaccineRoutes);
router.use("/feed", feedRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/expenses", expenseRoutes);
router.use("/sales", saleRoutes);
router.use("/staff", staffRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/alerts", alertRoutes);
router.use("/reports", reportRoutes);
router.use("/settings", settingsRoutes);
router.use("/sync", syncRoutes);

export default router;
