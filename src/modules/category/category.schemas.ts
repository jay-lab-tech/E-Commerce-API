import { z } from 'zod';

export const categoryCreateSchema = z.strictObject({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Minimal satu field harus diubah',
);

export const categoryListSchema = z.object({
  search: z.string().trim().max(80).optional(),
  includeInactive: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
