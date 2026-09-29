import type { RequestHandler } from 'express';
import {
  createProductService,
  deleteProductService,
  getProductService,
  listProductService,
  updateProductService,
} from './product.service.js';
import { productCreateSchema, productListSchema, productUpdateSchema } from './product.schemas.js';

function prismaCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function validationError(response: Parameters<RequestHandler>[1], issues: { path: PropertyKey[]; message: string }[]) {
  response.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request tidak valid',
      details: issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    },
  });
}

function resourceError(response: Parameters<RequestHandler>[1], code: string, message: string, status: number) {
  response.status(status).json({ error: { code, message } });
}

export const listProducts: RequestHandler = async (request, response, next) => {
  try {
    const parsed = productListSchema.safeParse(request.query);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const result = await listProductService({
      ...(parsed.data.search ? { search: parsed.data.search } : {}),
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(parsed.data.minPrice ? { minPrice: parsed.data.minPrice } : {}),
      ...(parsed.data.maxPrice ? { maxPrice: parsed.data.maxPrice } : {}),
      includeInactive: parsed.data.includeInactive,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
    response.json({ data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) { next(error); }
};

export const getProduct: RequestHandler = async (request, response, next) => {
  try {
    const slug = typeof request.params.slug === 'string' ? request.params.slug : '';
    const product = await getProductService(slug);
    if (!product || !product.isActive) { resourceError(response, 'PRODUCT_NOT_FOUND', 'Produk tidak ditemukan', 404); return; }
    response.json({ data: product });
  } catch (error) { next(error); }
};

export const createProduct: RequestHandler = async (request, response, next) => {
  try {
    const parsed = productCreateSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const product = await createProductService(parsed.data);
    response.status(201).json({ data: product });
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2002') { resourceError(response, 'PRODUCT_ALREADY_EXISTS', 'Slug produk sudah digunakan', 409); return; }
    if (code === 'P2003') { resourceError(response, 'CATEGORY_NOT_FOUND', 'Kategori tidak ditemukan', 400); return; }
    next(error);
  }
};

export const updateProduct: RequestHandler = async (request, response, next) => {
  try {
    const parsed = productUpdateSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const id = typeof request.params.id === 'string' ? request.params.id : '';
    const product = await updateProductService(id, parsed.data);
    response.json({ data: product });
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2002') { resourceError(response, 'PRODUCT_ALREADY_EXISTS', 'Slug produk sudah digunakan', 409); return; }
    if (code === 'P2003') { resourceError(response, 'CATEGORY_NOT_FOUND', 'Kategori tidak ditemukan', 400); return; }
    if (code === 'P2025') { resourceError(response, 'PRODUCT_NOT_FOUND', 'Produk tidak ditemukan', 404); return; }
    next(error);
  }
};

export const deleteProduct: RequestHandler = async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : '';
    const product = await deleteProductService(id);
    response.json({ data: product });
  } catch (error) {
    if (prismaCode(error) === 'P2025') { resourceError(response, 'PRODUCT_NOT_FOUND', 'Produk tidak ditemukan', 404); return; }
    next(error);
  }
};
