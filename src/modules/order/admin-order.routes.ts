import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { listAdminOrders, updateAdminOrderStatus } from './order.controller.js';

export const adminOrderRouter = Router();
adminOrderRouter.use(requireAuth, requireAdmin);
adminOrderRouter.get('/', listAdminOrders);
adminOrderRouter.patch('/:id/status', updateAdminOrderStatus);
