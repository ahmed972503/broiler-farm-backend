import { Router } from 'express';
import { ShedController } from '../controllers/shedController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireShedAccess } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { CreateShedSchema, UpdateShedSchema } from '@broiler/shared';

const router = Router();

router.use(authenticate);

router.get('/', ShedController.getAllSheds);
router.get('/:id', requireShedAccess, ShedController.getShedById);
router.post('/', requireAdmin, validateBody(CreateShedSchema), ShedController.createShed);
router.put('/:id', requireAdmin, validateBody(UpdateShedSchema), ShedController.updateShed);

export default router;
