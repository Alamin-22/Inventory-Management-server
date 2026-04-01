import { z } from 'zod';
import { PRODUCT_STATUS } from './product.constants';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const normalize = (s: string) => s.trim();

const stableSelectedOptionsSignature = (sel: Record<string, string>) => {
  return Object.keys(sel)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}:${sel[k]}`)
    .join('|');
};

const ImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
});

// For create/update flows where image could be uploaded file (multer) or already uploaded object
const ImageOrFileSchema = z.union([ImageSchema, z.object({ path: z.string() }).passthrough()]);

const InventorySchema = z.object({
  stock: z.number().int().min(0).default(0),
  minStockThreshold: z.number().int().min(0).default(10),
  preOrderLimit: z.number().int().min(0).default(0),
  preOrdersSold: z.number().int().min(0).default(0).optional(),
});

const ProductOptionZodSchema = z
  .object({
    name: z.string().min(1, 'Option name is required').transform(normalize),
    values: z.array(z.string().min(1).transform(normalize)).min(1, 'At least one option value is required'),
  })
  .superRefine((opt, ctx) => {
    const uniq = new Set(opt.values);
    if (uniq.size !== opt.values.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option values must be unique',
        path: ['values'],
      });
    }
  });

// Variants
const selectedOptionsSchema = z
  .record(z.string().transform(normalize), z.string().transform(normalize))
  .default({})
  .superRefine((sel, ctx) => {
    for (const [k, v] of Object.entries(sel)) {
      if (!k) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'selectedOptions contains an empty option name',
          path: [],
        });
        break;
      }
      if (!v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Option "${k}" value is required`,
          path: [],
        });
      }
    }
  });

const baseVariantObject = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),

  // Shopify-style selection (validated against product.options at product-level)
  selectedOptions: selectedOptionsSchema,

  priceBDT: z.number().min(0),
  oldPriceBDT: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),

  inventory: InventorySchema.default({ stock: 0, minStockThreshold: 10, preOrderLimit: 0 }),

  image: ImageOrFileSchema.optional(),
});

// --- VARIANT SCHEMA ---
const variantSchema = baseVariantObject.superRefine((v, ctx) => {
  if (typeof v.inventory?.stock !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Stock is required for all variants',
      path: ['inventory', 'stock'],
    });
  }
});

const variantPatchSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1).optional(),
  selectedOptions: selectedOptionsSchema.optional(),

  priceBDT: z.number().min(0).optional(),
  oldPriceBDT: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),

  inventory: InventorySchema.partial().optional(),
  image: ImageOrFileSchema.optional(),
});

// Base Product
const baseProductObject = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  category: objectId, // Required natively now
  brand: objectId.nullable().optional(), // Replaced verifiedBrandId

  description: z.string().optional(),
  videoReviewUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  warranty: z.string().optional(),

  images: z.array(ImageOrFileSchema).default([]),
  specifications: z.record(z.string(), z.string()).optional(),

  options: z.array(ProductOptionZodSchema).default([]),

  // combinations
  variants: z.array(variantSchema).min(1),

  adminNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),

  status: z
    .enum([PRODUCT_STATUS.Draft, PRODUCT_STATUS.Active, PRODUCT_STATUS.Out_Of_Stock, PRODUCT_STATUS.Deleted])
    .optional(),
  isPublished: z.boolean().optional(),
  seo: z
    .object({
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      canonicalUrl: z.string().optional(),
    })
    .optional(),
});

// Cross-field Shopify validations
const enforceVariantIntegrity = (p: z.infer<typeof baseProductObject>, ctx: z.RefinementCtx) => {
  const optionNameToValues = new Map<string, Set<string>>();
  for (const opt of p.options ?? []) {
    const name = opt.name?.trim();
    if (!name) continue;
    optionNameToValues.set(name, new Set((opt.values ?? []).map((v) => v.trim())));
  }

  const declaredOptionNames = Array.from(optionNameToValues.keys());

  // Product option names must be unique
  {
    const uniq = new Set(declaredOptionNames);
    if (uniq.size !== declaredOptionNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Product option names must be unique',
        path: ['options'],
      });
    }
  }

  const seenSkus = new Set<string>();
  const seenCombos = new Set<string>();

  p.variants.forEach((v, idx) => {
    // SKU uniqueness within the product
    if (seenSkus.has(v.sku)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate SKU in variants',
        path: ['variants', idx, 'sku'],
      });
    } else {
      seenSkus.add(v.sku);
    }

    const sel = v.selectedOptions ?? {};
    const selKeys = Object.keys(sel);

    // If product declares options, variants must match them strictly
    if (declaredOptionNames.length > 0) {
      // must include all declared keys
      for (const optName of declaredOptionNames) {
        if (!(optName in sel)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Missing selected option: ${optName}`,
            path: ['variants', idx, 'selectedOptions'],
          });
        }
      }

      // must not include unknown keys
      for (const k of selKeys) {
        if (!optionNameToValues.has(k)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown option name "${k}"`,
            path: ['variants', idx, 'selectedOptions', k],
          });
        }
      }

      // values must be allowed
      for (const [k, value] of Object.entries(sel)) {
        const allowed = optionNameToValues.get(k);
        if (!allowed) continue;
        if (!allowed.has(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid value "${value}" for option "${k}"`,
            path: ['variants', idx, 'selectedOptions', k],
          });
        }
      }
    } else {
      // If no options are declared, selectedOptions should be empty (strict)
      if (selKeys.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'selectedOptions must be empty when product.options is empty',
          path: ['variants', idx, 'selectedOptions'],
        });
      }
    }

    // Non-empty selectedOptions when options exist
    if (declaredOptionNames.length > 0 && selKeys.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'selectedOptions must not be empty when product has options',
        path: ['variants', idx, 'selectedOptions'],
      });
    }

    // Unique combination
    const sig = stableSelectedOptionsSignature(sel);
    if (seenCombos.has(sig)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate variant option combination',
        path: ['variants', idx, 'selectedOptions'],
      });
    } else {
      seenCombos.add(sig);
    }
  });
};

// Create
const createProductBody = baseProductObject.superRefine((p, ctx) => {
  enforceVariantIntegrity(p, ctx);
});

// Publish
const publishableProductBody = baseProductObject
  .extend({
    images: z.array(ImageSchema).default([]),
    variants: z.array(baseVariantObject.extend({ image: ImageSchema.optional() })).min(1),
  })
  .superRefine((p, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enforceVariantIntegrity(p as any, ctx);

    if (p.isPublished) {
      if (!p.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cannot publish a product without a Category.',
          path: ['category'],
        });
      }
      if (!p.images || p.images.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Published product must have at least one image.',
          path: ['images'],
        });
      }
      if (p.status && p.status !== PRODUCT_STATUS.Active && p.status !== PRODUCT_STATUS.Out_Of_Stock) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Published product status must be Active or Out_Of_Stock.',
          path: ['status'],
        });
      }
    }
  });

// Update
const updateProductBody = baseProductObject.partial().extend({
  variants: z.array(variantPatchSchema).optional(),
  seo: z
    .object({
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      canonicalUrl: z.string().optional(),
    })
    .optional(),
});

const permanentDeleteZodSchema = z.object({
  body: z.object({
    productIds: z.array(objectId).min(1),
  }),
});

export const productValidationSchemas = {
  createProductZodSchema: z.object({ body: createProductBody }),
  updateProductZodSchema: z.object({ body: updateProductBody }),
  publishableProductZodSchema: z.object({ body: publishableProductBody }),
  permanentDeleteZodSchema,
};
