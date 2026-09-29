import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from './product.controller.js';

export const productRouter = Router();
productRouter.get('/', listProducts);
productRouter.get('/:slug', getProduct);
productRouter.post('/', requireAuth, requireAdmin, createProduct);
productRouter.put('/:id', requireAuth, requireAdmin, updateProduct);
productRouter.delete('/:id', requireAuth, requireAdmin, deleteProduct);
