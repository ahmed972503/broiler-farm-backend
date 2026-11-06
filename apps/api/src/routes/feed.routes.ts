import { Router } from "express";
import { FeedController } from "../controllers/feedController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import {
  CreateFeedPurchaseSchema,
  CreateFeedIssueSchema,
  CreateFeedTransferSchema,
} from "@broiler/shared";

const router = Router();

router.use(authenticate);

router.get("/stock", FeedController.getStock);
router.post(
  "/purchases",
  requireAdmin,
  validateBody(CreateFeedPurchaseSchema),
  FeedController.createPurchase,
);
router.post(
  "/issues",
  requireAdmin,
  validateBody(CreateFeedIssueSchema),
  FeedController.createIssue,
);
router.get("/reconciliation", requireAdmin, FeedController.getReconciliation);

router.post(
  "/transfers",
  requireAdmin,
  validateBody(CreateFeedTransferSchema),
  FeedController.createTransfer,
);
router.get("/transfers", requireAdmin, FeedController.getTransfers);
router.get("/party-ledger", requireAdmin, FeedController.getPartyLedger);

export default router;
