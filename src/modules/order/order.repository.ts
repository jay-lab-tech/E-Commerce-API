import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import type { CheckoutInput, OrderStatusInput } from './order.schemas.js';

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
    public readonly code: 'EMPTY_CART' | 'PRODUCT_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'ORDER_NOT_FOUND' | 'INVALID_STATUS_TRANSITION' | 'INVALID_PAYMENT_STATE',
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

export function findAdminOrders(status: OrderStatusInput | undefined, skip: number, take: number) {
  const where = status ? { status } : {};
  return prisma.$transaction([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: orderInclude }),
    prisma.order.count({ where }),
  ]);
}

export async function confirmMockPayment(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id, userId }, include: { payment: true } });
    if (!order) throw new OrderError('ORDER_NOT_FOUND', 'Order tidak ditemukan');
    if (order.payment?.status === 'PAID' && order.status === 'PAID') {
      return tx.order.findUnique({ where: { id }, include: orderInclude });
    }
    if (!order.payment || order.status !== 'PENDING' || order.payment.status !== 'PENDING') {
      throw new OrderError('INVALID_PAYMENT_STATE', 'Order tidak dapat dibayar pada status saat ini');
    }

    await tx.payment.update({ where: { orderId: id }, data: { status: 'PAID', paidAt: new Date() } });
    return tx.order.update({ where: { id }, data: { status: 'PAID', paymentStatus: 'PAID' }, include: orderInclude });
  });
}

const allowedTransitions: Record<OrderStatusInput, OrderStatusInput[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateAdminOrderStatus(id: string, nextStatus: OrderStatusInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true, payment: true } });
    if (!order) throw new OrderError('ORDER_NOT_FOUND', 'Order tidak ditemukan');
    if (order.status === nextStatus) return tx.order.findUnique({ where: { id }, include: orderInclude });
    if (!allowedTransitions[order.status].includes(nextStatus)) {
      throw new OrderError('INVALID_STATUS_TRANSITION', `Order tidak dapat berubah dari ${order.status} ke ${nextStatus}`);
    }

    if (nextStatus === 'CANCELLED') {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await tx.inventoryMovement.create({
          data: { productId: item.productId, type: 'RELEASE', quantity: item.quantity, reference: `cancel:${order.orderNumber}` },
        });
      }
    }

    const paymentStatus = nextStatus === 'CANCELLED'
      ? order.payment?.status === 'PAID' ? 'REFUNDED' : 'EXPIRED'
      : undefined;
    if (paymentStatus && order.payment) {
      await tx.payment.update({ where: { orderId: id }, data: { status: paymentStatus } });
    }
    return tx.order.update({
      where: { id },
      data: { status: nextStatus, ...(paymentStatus ? { paymentStatus } : {}) },
      include: orderInclude,
    });
  });
}
