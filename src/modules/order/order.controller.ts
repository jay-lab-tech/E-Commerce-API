import type { RequestHandler } from 'express';
import { OrderError } from './order.repository.js';
import { checkoutService, confirmMockPaymentService, getOrderService, listAdminOrdersService, listOrdersService, updateAdminOrderStatusService } from './order.service.js';
import { adminOrderListSchema, checkoutSchema, orderListSchema, updateOrderStatusSchema } from './order.schemas.js';

function validationError(response: Parameters<RequestHandler>[1], issues: { path: PropertyKey[]; message: string }[]) {
  response.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request tidak valid',
      details: issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    },
  });
}

function idFromParams(request: Parameters<RequestHandler>[0]) {
  return typeof request.params.id === 'string' ? request.params.id : '';
}

function handleOrderError(response: Parameters<RequestHandler>[1], error: unknown) {
  if (!(error instanceof OrderError)) return false;
  const status = error.code === 'INSUFFICIENT_STOCK' || error.code === 'INVALID_STATUS_TRANSITION' || error.code === 'INVALID_PAYMENT_STATE'
    ? 409
    : error.code === 'EMPTY_CART' ? 400 : 404;
  response.status(status).json({ error: { code: error.code, message: error.message } });
  return true;
}

export const checkout: RequestHandler = async (request, response, next) => {
  try {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const order = await checkoutService(request.auth?.userId ?? '', parsed.data);
    response.status(201).json({ data: order });
  } catch (error) {
    if (handleOrderError(response, error)) return;
    next(error);
  }
};

export const listOrders: RequestHandler = async (request, response, next) => {
  try {
    const parsed = orderListSchema.safeParse(request.query);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const result = await listOrdersService(request.auth?.userId ?? '', parsed.data.page, parsed.data.limit);
    response.json({ data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) { next(error); }
};

export const getOrder: RequestHandler = async (request, response, next) => {
  try {
    const order = await getOrderService(request.auth?.userId ?? '', idFromParams(request));
    if (!order) {
      response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order tidak ditemukan' } });
      return;
    }
    response.json({ data: order });
  } catch (error) { next(error); }
};

export const confirmMockPayment: RequestHandler = async (request, response, next) => {
  try {
    const order = await confirmMockPaymentService(request.auth?.userId ?? '', idFromParams(request));
    response.json({ data: order });
  } catch (error) {
    if (handleOrderError(response, error)) return;
    next(error);
  }
};

export const listAdminOrders: RequestHandler = async (request, response, next) => {
  try {
    const parsed = adminOrderListSchema.safeParse(request.query);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const result = await listAdminOrdersService(parsed.data.status, parsed.data.page, parsed.data.limit);
    response.json({ data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) { next(error); }
};

export const updateAdminOrderStatus: RequestHandler = async (request, response, next) => {
  try {
    const parsed = updateOrderStatusSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const order = await updateAdminOrderStatusService(idFromParams(request), parsed.data.status);
    response.json({ data: order });
  } catch (error) {
    if (handleOrderError(response, error)) return;
    next(error);
  }
};
