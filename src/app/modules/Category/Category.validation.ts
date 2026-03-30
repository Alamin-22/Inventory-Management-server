import { z } from 'zod';

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required'),
    description: z.string().optional(),
    parentCategory: z.string().optional(),
  }),
});

const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    parentCategory: z.string().optional(),
  }),
});

const reorderCategoryZodSchema = z.object({
  body: z.array(
    z.object({
      id: z.string({ error: 'ID is required' }),
      order: z.number({ error: 'Order index is required' }),
    }),
  ),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
  reorderCategoryZodSchema,
};
