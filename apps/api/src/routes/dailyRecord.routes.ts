import { Router } from 'express';
import { DailyRecordController } from '../controllers/dailyRecordController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireShedAccess } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  CreateDailyRecordSchema,
  UpdateDailyRecordSchema,
  UnlockDailyRecordSchema
} from '@broiler/shared';

const router = Router();

router.use(authenticate);

router.get('/', DailyRecordController.getDailyRecords);
router.get('/today/:shedId?', requireShedAccess, DailyRecordController.getTodayRecord);
router.post('/', requireShedAccess, validateBody(CreateDailyRecordSchema), DailyRecordController.createDailyRecord);
router.put('/:id', requireShedAccess, validateBody(UpdateDailyRecordSchema), DailyRecordController.updateDailyRecord);
router.post('/:id/unlock', requireAdmin, validateBody(UnlockDailyRecordSchema), DailyRecordController.unlockDailyRecord);

export default router;
