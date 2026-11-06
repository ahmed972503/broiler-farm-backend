import { Router } from "express";
import { ReportController } from "../controllers/reportController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/batch/:id", ReportController.getBatchReport);
router.get("/batch/:id/csv", ReportController.getBatchCSV);
router.get("/weekly-summary/:batchId", ReportController.getWeeklySummary);
router.get("/daily-register/:batchId/csv", ReportController.exportDailyRegisterCSV);
router.get("/weekly-summary/:batchId/csv", ReportController.exportWeeklySummaryCSV);
router.get("/daily-register/:batchId/html", ReportController.exportDailyRegisterHTML);
router.get("/weekly-summary/:batchId/html", ReportController.exportWeeklySummaryHTML);
router.get("/feed-party-ledger", ReportController.getFeedPartyLedger);
router.get("/sheds", ReportController.getShedComparison);
router.get("/feed", ReportController.getFeedReport);
router.get("/expenses", ReportController.getExpenseReport);
router.get("/sales", ReportController.getSalesLedgerReport);
router.get("/wages", ReportController.getWagesReport);

export default router;
