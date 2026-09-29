import { prisma } from '../../config/database.js';

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function findCategories(args: {
  search?: string;
  includeInactive: boolean;
  skip: number;
  take: number;
}) {
  const where = {
    ...(args.includeInactive ? {} : { isActive: true }),
    ...(args.search ? { name: { contains: args.search, mode: 'insensitive' as const } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.category.findMany({ where, orderBy: { name: 'asc' }, skip: args.skip, take: args.take, select: categorySelect }),
    prisma.category.count({ where }),
  ]);
  return { items, total };
}

export function findCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug }, select: categorySelect });
}

export function createCategory(data: { name: string; slug: string }) {
  return prisma.category.create({ data, select: categorySelect });
}

export function updateCategory(id: string, data: { name?: string; slug?: string }) {
  return prisma.category.update({ where: { id }, data, select: categorySelect });
}

export function deactivateCategory(id: string) {
  return prisma.category.update({ where: { id }, data: { isActive: false }, select: categorySelect });
}
