import { Router } from 'express';
import { FeedController } from '../controllers/feedController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { CreateFeedPurchaseSchema, CreateFeedIssueSchema } from '@broiler/shared';

const router = Router();

router.use(authenticate);

router.get('/stock', FeedController.getStock);
router.post('/purchases', requireAdmin, validateBody(CreateFeedPurchaseSchema), FeedController.createPurchase);
router.post('/issues', requireAdmin, validateBody(CreateFeedIssueSchema), FeedController.createIssue);
router.get('/reconciliation', requireAdmin, FeedController.getReconciliation);

export default router;
