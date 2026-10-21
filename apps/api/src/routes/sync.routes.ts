import { Router } from 'express';
import { SyncController } from '../controllers/syncController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { SyncPacketSchema } from '@broiler/shared';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(SyncPacketSchema), SyncController.sync);

export default router;
