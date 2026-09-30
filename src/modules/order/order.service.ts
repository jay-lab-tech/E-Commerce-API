import { confirmMockPayment, createOrderFromCart, findAdminOrders, findUserOrder, findUserOrders, updateAdminOrderStatus } from './order.repository.js';
import type { CheckoutInput, OrderStatusInput } from './order.schemas.js';

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

export async function listAdminOrdersService(status: OrderStatusInput | undefined, page: number, limit: number) {
  const [items, total] = await findAdminOrders(status, (page - 1) * limit, limit);
  return { items, total, page, limit };
}

export function confirmMockPaymentService(userId: string, id: string) {
  return confirmMockPayment(userId, id);
}

export function updateAdminOrderStatusService(id: string, status: OrderStatusInput) {
  return updateAdminOrderStatus(id, status);
}
