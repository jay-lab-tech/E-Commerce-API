import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from './category.controller.js';

export const categoryRouter = Router();
categoryRouter.get('/', listCategories);
categoryRouter.get('/:slug', getCategory);
categoryRouter.post('/', requireAuth, requireAdmin, createCategory);
categoryRouter.put('/:id', requireAuth, requireAdmin, updateCategory);
categoryRouter.delete('/:id', requireAuth, requireAdmin, deleteCategory);
