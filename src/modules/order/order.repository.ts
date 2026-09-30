import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import type { CheckoutInput } from './order.schemas.js';

const orderInclude = {
  items: { orderBy: { productName: 'asc' as const } },
  payment: true,
} as const;

function priceToCents(value: unknown) {
  const text = String(value);
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole ?? '0') * 100n + BigInt((fraction + '00').slice(0, 2));
}

function centsToPrice(cents: bigint) {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function makeOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `ORD-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createOrderFromCart(userId: string, input: CheckoutInput) {
  return prisma.$transaction(async (tx) => {
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    if (cartItems.length === 0) {
      throw new OrderError('EMPTY_CART', 'Keranjang masih kosong');
    }

    let totalCents = 0n;
    const orderItems = [];

    for (const cartItem of cartItems) {
      if (!cartItem.product.isActive) {
        throw new OrderError('PRODUCT_NOT_FOUND', `Produk ${cartItem.product.name} sudah tidak aktif`);
      }

      const updated = await tx.product.updateMany({
        where: { id: cartItem.productId, isActive: true, stock: { gte: cartItem.quantity } },
        data: { stock: { decrement: cartItem.quantity } },
      });
      if (updated.count !== 1) {
        throw new OrderError('INSUFFICIENT_STOCK', `Stok produk ${cartItem.product.name} tidak mencukupi`);
      }

      const price = priceToCents(cartItem.product.price);
      const subtotal = price * BigInt(cartItem.quantity);
      totalCents += subtotal;
      orderItems.push({
        productId: cartItem.productId,
        productName: cartItem.product.name,
        price: cartItem.product.price,
        quantity: cartItem.quantity,
        subtotal: centsToPrice(subtotal),
      });

      await tx.inventoryMovement.create({
        data: {
          productId: cartItem.productId,
          type: 'RESERVATION',
          quantity: cartItem.quantity,
          reference: `checkout:${userId}`,
        },
      });
    }

    const orderNumber = makeOrderNumber();
    const totalAmount = centsToPrice(totalCents);
    const order = await tx.order.create({
      data: {
        userId,
        orderNumber,
        totalAmount,
        shippingAddress: input.shippingAddress,
        items: { create: orderItems },
        payment: {
          create: {
            externalId: `mock-${orderNumber}`,
            method: 'MOCK',
            amount: totalAmount,
          },
        },
      },
      include: orderInclude,
    });

    await tx.cartItem.deleteMany({ where: { userId } });
    return order;
  });
}

export class OrderError extends Error {
  constructor(
    public readonly code: 'EMPTY_CART' | 'PRODUCT_NOT_FOUND' | 'INSUFFICIENT_STOCK',
    message: string,
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

export function findUserOrders(userId: string, skip: number, take: number) {
  return prisma.$transaction([
    prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take, include: orderInclude }),
    prisma.order.count({ where: { userId } }),
  ]);
}

export function findUserOrder(userId: string, id: string) {
  return prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
}
