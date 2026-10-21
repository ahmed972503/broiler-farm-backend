import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', AlertController.getAlerts);
router.post('/:id/resolve', requireAdmin, AlertController.resolveAlert);
router.post('/sweep', requireAdmin, AlertController.triggerSweep);

export default router;
