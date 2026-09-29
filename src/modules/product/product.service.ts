import { slugify } from '../../utils/slugify.js';
import {
  createProduct,
  deactivateProduct,
  findProductBySlug,
  findProducts,
  updateProduct,
} from './product.repository.js';
import type { ProductCreateInput, ProductUpdateInput } from './product.schemas.js';

export async function listProductService(input: {
  search?: string; category?: string; minPrice?: string; maxPrice?: string;
  includeInactive: boolean; page: number; limit: number;
}) {
  const result = await findProducts({
    ...(input.search ? { search: input.search } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.minPrice ? { minPrice: input.minPrice } : {}),
    ...(input.maxPrice ? { maxPrice: input.maxPrice } : {}),
    includeInactive: input.includeInactive,
    skip: (input.page - 1) * input.limit,
    take: input.limit,
  });
  return { ...result, page: input.page, limit: input.limit };
}

export function getProductService(slug: string) {
  return findProductBySlug(slug);
}

export function createProductService(input: ProductCreateInput) {
  return createProduct({
    categoryId: input.categoryId,
    name: input.name,
    slug: input.slug ?? slugify(input.name),
    ...(input.description !== undefined ? { description: input.description } : {}),
    price: input.price,
    stock: input.stock,
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
  });
}

export function updateProductService(id: string, input: ProductUpdateInput) {
  return updateProduct(id, {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
  });
}

export function deleteProductService(id: string) {
  return deactivateProduct(id);
}
