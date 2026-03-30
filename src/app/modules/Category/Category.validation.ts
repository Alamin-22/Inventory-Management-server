import { z } from 'zod';

const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    parentCategory: z.string().optional(),
    categoryImage: z.string().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    parentCategory: z.string().optional(),
    categoryImage: z.string().optional(),
    isFeatured: z.boolean().optional(),
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

export const categoryValidationSchemas = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
  reorderCategoryZodSchema,
};
