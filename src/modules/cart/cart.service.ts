import {
  clearCart,
  deleteCartItem,
  findActiveProduct,
  findCartItem,
  findCartItems,
  upsertCartItem,
} from './cart.repository.js';
import type { AddCartItemInput, UpdateCartItemInput } from './cart.schemas.js';

export class CartError extends Error {
  constructor(public readonly code: 'PRODUCT_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'CART_ITEM_NOT_FOUND', message: string) {
    super(message);
    this.name = 'CartError';
  }
}

async function assertStock(productId: string, quantity: number) {
  const product = await findActiveProduct(productId);
  if (!product) throw new CartError('PRODUCT_NOT_FOUND', 'Produk tidak ditemukan atau tidak aktif');
  if (quantity > product.stock) throw new CartError('INSUFFICIENT_STOCK', 'Jumlah melebihi stok produk');
}

export function listCartService(userId: string) {
  return findCartItems(userId);
}

export async function addCartItemService(userId: string, input: AddCartItemInput) {
  const existing = await findCartItem(userId, input.productId);
  const quantity = (existing?.quantity ?? 0) + input.quantity;
  await assertStock(input.productId, quantity);
  return upsertCartItem(userId, input.productId, quantity);
}

export async function updateCartItemService(userId: string, productId: string, input: UpdateCartItemInput) {
  const existing = await findCartItem(userId, productId);
  if (!existing) throw new CartError('CART_ITEM_NOT_FOUND', 'Item tidak ditemukan di keranjang');
  await assertStock(productId, input.quantity);
  return upsertCartItem(userId, productId, input.quantity);
}

export async function deleteCartItemService(userId: string, productId: string) {
  const existing = await findCartItem(userId, productId);
  if (!existing) throw new CartError('CART_ITEM_NOT_FOUND', 'Item tidak ditemukan di keranjang');
  return deleteCartItem(userId, productId);
}

export function clearCartService(userId: string) {
  return clearCart(userId);
}
