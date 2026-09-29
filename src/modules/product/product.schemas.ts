import { z } from 'zod';

const priceSchema = z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, 'Harga harus berupa angka positif dengan maksimal 2 desimal');

export const productCreateSchema = z.strictObject({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  price: priceSchema,
  stock: z.coerce.number().int().min(0).default(0),
  imageUrl: z.string().url().max(2048).nullable().optional(),
});

export const productUpdateSchema = productCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Minimal satu field harus diubah',
);

export const productListSchema = z.object({
  search: z.string().trim().max(160).optional(),
  category: z.string().trim().max(100).optional(),
  minPrice: priceSchema.optional(),
  maxPrice: priceSchema.optional(),
  includeInactive: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (value) => !value.minPrice || !value.maxPrice || Number(value.minPrice) <= Number(value.maxPrice),
  { path: ['maxPrice'], message: 'maxPrice harus lebih besar atau sama dengan minPrice' },
);

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
