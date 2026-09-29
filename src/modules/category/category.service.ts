import { slugify } from '../../utils/slugify.js';
import {
  createCategory,
  deactivateCategory,
  findCategories,
  findCategoryBySlug,
  updateCategory,
} from './category.repository.js';
import type { CategoryCreateInput, CategoryUpdateInput } from './category.schemas.js';

export async function listCategoryService(input: {
  search?: string;
  includeInactive: boolean;
  page: number;
  limit: number;
}) {
  const result = await findCategories({
    ...(input.search ? { search: input.search } : {}),
    includeInactive: input.includeInactive,
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  });
  return { ...result, page: input.page, limit: input.limit };
}

export function getCategoryService(slug: string) {
  return findCategoryBySlug(slug);
}

export function createCategoryService(input: CategoryCreateInput) {
  return createCategory({ name: input.name, slug: input.slug ?? slugify(input.name) });
}

export function updateCategoryService(id: string, input: CategoryUpdateInput) {
  return updateCategory(id, {
    ...(input.name ? { name: input.name } : {}),
    ...(input.slug ? { slug: input.slug } : {}),
  });
}

export function deleteCategoryService(id: string) {
  return deactivateCategory(id);
}
