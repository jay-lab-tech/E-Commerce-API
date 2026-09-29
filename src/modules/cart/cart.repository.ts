import { prisma } from '../../config/database.js';

const cartItemSelect = {
  id: true,
  userId: true,
  productId: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stock: true,
      imageUrl: true,
      isActive: true,
    },
  },
} as const;

export function findCartItems(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: cartItemSelect,
  });
}

export function findCartItem(userId: string, productId: string) {
  return prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: cartItemSelect,
  });
}

export function upsertCartItem(userId: string, productId: string, quantity: number) {
  return prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId, quantity },
    update: { quantity },
    select: cartItemSelect,
  });
}

export function deleteCartItem(userId: string, productId: string) {
  return prisma.cartItem.delete({
    where: { userId_productId: { userId, productId } },
    select: cartItemSelect,
  });
}

export function clearCart(userId: string) {
  return prisma.cartItem.deleteMany({ where: { userId } });
}

export function findActiveProduct(productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, stock: true },
  });
}
