import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { checkout, confirmMockPayment, getOrder, listOrders } from './order.controller.js';

export const orderRouter = Router();
orderRouter.use(requireAuth);
orderRouter.post('/', checkout);
orderRouter.get('/', listOrders);
orderRouter.post('/:id/pay', confirmMockPayment);
orderRouter.get('/:id', getOrder);
