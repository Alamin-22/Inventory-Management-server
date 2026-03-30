import { z } from 'zod';

const createBrandZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Brand name is required'),
    description: z.string().optional(),
    logo: z.string().optional(),
    brandLabel: z.string().optional(),
    isPublished: z.boolean().optional(),
  }),
});

const updateBrandZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    logo: z.string().optional(),
    brandLabel: z.string().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const brandValidationSchemas = {
  createBrandZodSchema,
  updateBrandZodSchema,
};
