import type { RequestHandler } from 'express';
import {
  addCartItemService,
  CartError,
  clearCartService,
  deleteCartItemService,
  listCartService,
  updateCartItemService,
} from './cart.service.js';
import { addCartItemSchema, updateCartItemSchema } from './cart.schemas.js';

function validationError(response: Parameters<RequestHandler>[1], issues: { path: PropertyKey[]; message: string }[]) {
  response.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request tidak valid',
      details: issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    },
  });
}

function productIdFromParams(request: Parameters<RequestHandler>[0]) {
  return typeof request.params.productId === 'string' ? request.params.productId : '';
}

function handleCartError(response: Parameters<RequestHandler>[1], error: unknown) {
  if (!(error instanceof CartError)) return false;
  const status = error.code === 'CART_ITEM_NOT_FOUND' ? 404 : error.code === 'PRODUCT_NOT_FOUND' ? 404 : 409;
  response.status(status).json({ error: { code: error.code, message: error.message } });
  return true;
}

export const getCart: RequestHandler = async (request, response, next) => {
  try {
    const items = await listCartService(request.auth?.userId ?? '');
    response.json({ data: items });
  } catch (error) { next(error); }
};

export const addCartItem: RequestHandler = async (request, response, next) => {
  try {
    const parsed = addCartItemSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const item = await addCartItemService(request.auth?.userId ?? '', parsed.data);
    response.status(201).json({ data: item });
  } catch (error) {
    if (handleCartError(response, error)) return;
    next(error);
  }
};

export const updateCartItem: RequestHandler = async (request, response, next) => {
  try {
    const parsed = updateCartItemSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const item = await updateCartItemService(request.auth?.userId ?? '', productIdFromParams(request), parsed.data);
    response.json({ data: item });
  } catch (error) {
    if (handleCartError(response, error)) return;
    next(error);
  }
};

export const removeCartItem: RequestHandler = async (request, response, next) => {
  try {
    const item = await deleteCartItemService(request.auth?.userId ?? '', productIdFromParams(request));
    response.json({ data: item });
  } catch (error) {
    if (handleCartError(response, error)) return;
    next(error);
  }
};

export const removeCart: RequestHandler = async (request, response, next) => {
  try {
    const result = await clearCartService(request.auth?.userId ?? '');
    response.json({ data: { deletedCount: result.count } });
  } catch (error) { next(error); }
};
