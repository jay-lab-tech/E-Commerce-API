import { z } from 'zod';

export const addCartItemSchema = z.strictObject({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.strictObject({
  quantity: z.coerce.number().int().min(1).max(99),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
