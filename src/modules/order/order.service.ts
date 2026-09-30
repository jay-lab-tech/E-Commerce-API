import { createOrderFromCart, findUserOrder, findUserOrders } from './order.repository.js';
import type { CheckoutInput } from './order.schemas.js';

export function checkoutService(userId: string, input: CheckoutInput) {
  return createOrderFromCart(userId, input);
}

export async function listOrdersService(userId: string, page: number, limit: number) {
  const [items, total] = await findUserOrders(userId, (page - 1) * limit, limit);
  return { items, total, page, limit };
}

export function getOrderService(userId: string, id: string) {
  return findUserOrder(userId, id);
}
