import { Router } from 'express';
import { SaleController } from '../controllers/saleController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { CreateSaleSchema, CreateBuyerPaymentSchema } from '@broiler/shared';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', SaleController.getSales);
router.post('/', validateBody(CreateSaleSchema), SaleController.createSale);
router.post('/payment', validateBody(CreateBuyerPaymentSchema), SaleController.recordBuyerPayment);
router.get('/ledger/:buyerName', SaleController.getBuyerLedger);

export default router;
