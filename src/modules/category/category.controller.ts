import type { RequestHandler } from 'express';
import {
  createCategoryService,
  deleteCategoryService,
  getCategoryService,
  listCategoryService,
  updateCategoryService,
} from './category.service.js';
import { categoryCreateSchema, categoryListSchema, categoryUpdateSchema } from './category.schemas.js';

function prismaCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function validationError(response: Parameters<RequestHandler>[1], issues: { path: PropertyKey[]; message: string }[]) {
  response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request tidak valid', details: issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) } });
}

export const listCategories: RequestHandler = async (request, response, next) => {
  try {
    const parsed = categoryListSchema.safeParse(request.query);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const result = await listCategoryService({
      ...(parsed.data.search ? { search: parsed.data.search } : {}),
      includeInactive: parsed.data.includeInactive,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
    response.json({ data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (error) { next(error); }
};

export const getCategory: RequestHandler = async (request, response, next) => {
  try {
    const slug = typeof request.params.slug === 'string' ? request.params.slug : '';
    const category = await getCategoryService(slug);
    if (!category || !category.isActive) {
      response.status(404).json({ error: { code: 'CATEGORY_NOT_FOUND', message: 'Kategori tidak ditemukan' } }); return;
    }
    response.json({ data: category });
  } catch (error) { next(error); }
};

export const createCategory: RequestHandler = async (request, response, next) => {
  try {
    const parsed = categoryCreateSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const category = await createCategoryService(parsed.data);
    response.status(201).json({ data: category });
  } catch (error) {
    if (prismaCode(error) === 'P2002') { response.status(409).json({ error: { code: 'CATEGORY_ALREADY_EXISTS', message: 'Nama atau slug kategori sudah digunakan' } }); return; }
    next(error);
  }
};

export const updateCategory: RequestHandler = async (request, response, next) => {
  try {
    const parsed = categoryUpdateSchema.safeParse(request.body);
    if (!parsed.success) { validationError(response, parsed.error.issues); return; }
    const id = typeof request.params.id === 'string' ? request.params.id : '';
    const category = await updateCategoryService(id, parsed.data);
    response.json({ data: category });
  } catch (error) {
    if (prismaCode(error) === 'P2002') { response.status(409).json({ error: { code: 'CATEGORY_ALREADY_EXISTS', message: 'Nama atau slug kategori sudah digunakan' } }); return; }
    if (prismaCode(error) === 'P2025') { response.status(404).json({ error: { code: 'CATEGORY_NOT_FOUND', message: 'Kategori tidak ditemukan' } }); return; }
    next(error);
  }
};

export const deleteCategory: RequestHandler = async (request, response, next) => {
  try {
    const id = typeof request.params.id === 'string' ? request.params.id : '';
    const category = await deleteCategoryService(id);
    response.json({ data: category });
  } catch (error) {
    if (prismaCode(error) === 'P2025') { response.status(404).json({ error: { code: 'CATEGORY_NOT_FOUND', message: 'Kategori tidak ditemukan' } }); return; }
    next(error);
  }
};
