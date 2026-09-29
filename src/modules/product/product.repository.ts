import { prisma } from '../../config/database.js';

const productSelect = {
  id: true,
  categoryId: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  stock: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

export async function findProducts(args: {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  includeInactive: boolean;
  skip: number;
  take: number;
}) {
  const where = {
    ...(args.includeInactive ? {} : { isActive: true }),
    ...(args.search ? { name: { contains: args.search, mode: 'insensitive' as const } } : {}),
    ...(args.category ? { category: { slug: args.category, isActive: true } } : {}),
    ...((args.minPrice || args.maxPrice) ? {
      price: {
        ...(args.minPrice ? { gte: args.minPrice } : {}),
        ...(args.maxPrice ? { lte: args.maxPrice } : {}),
      },
    } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip: args.skip, take: args.take, select: productSelect }),
    prisma.product.count({ where }),
  ]);
  return { items, total };
}

export function findProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug }, select: productSelect });
}

export function createProduct(data: {
  categoryId: string; name: string; slug: string; description?: string | null;
  price: string; stock: number; imageUrl?: string | null;
}) {
  return prisma.product.create({ data, select: productSelect });
}

export function updateProduct(id: string, data: Record<string, unknown>) {
  return prisma.product.update({ where: { id }, data, select: productSelect });
}

export function deactivateProduct(id: string) {
  return prisma.product.update({ where: { id }, data: { isActive: false }, select: productSelect });
}
