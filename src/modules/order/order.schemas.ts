import { z } from 'zod';

export const checkoutSchema = z.strictObject({
  shippingAddress: z.string().trim().min(10).max(1000),
});

export const orderListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
