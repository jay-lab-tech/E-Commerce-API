import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { addCartItem, getCart, removeCart, removeCartItem, updateCartItem } from './cart.controller.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);
cartRouter.get('/', getCart);
cartRouter.post('/items', addCartItem);
cartRouter.patch('/items/:productId', updateCartItem);
cartRouter.delete('/items/:productId', removeCartItem);
cartRouter.delete('/', removeCart);
