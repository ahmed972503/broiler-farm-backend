import { Router } from 'express';
import { StaffController } from '../controllers/staffController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import {
  CreateStaffSchema,
  RecordAttendanceSchema,
  CreateStaffAdvanceSchema
} from '@broiler/shared';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', StaffController.getStaff);
router.post('/', validateBody(CreateStaffSchema), StaffController.createStaff);
router.put('/:id', StaffController.updateStaff);
router.post('/attendance', validateBody(RecordAttendanceSchema), StaffController.recordAttendance);
router.get('/attendance', StaffController.getAttendance);
router.post('/advances', validateBody(CreateStaffAdvanceSchema), StaffController.createAdvance);
router.get('/wages', StaffController.getWageSummary);

export default router;
