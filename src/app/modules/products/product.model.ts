import mongoose, { Model, Schema } from 'mongoose';
import { I_inventory, IProduct, IProductImage, IProductOption, IProductVariant } from './product.interface';
import { PRODUCT_STATUS } from './product.constants';

export type TProductModel = Model<IProduct>;

const nonEmptyStringArrayValidator = (arr: unknown) => {
  return Array.isArray(arr) && arr.length > 0 && arr.every((v) => typeof v === 'string' && v.trim().length > 0);
};

const ImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const ProductOptionSchema = new Schema<IProductOption>(
  {
    name: { type: String, required: true, trim: true },
    values: {
      type: [String],
      default: undefined,
      validate: [
        {
          validator: nonEmptyStringArrayValidator,
          message: 'Option values must be a non-empty array of non-empty strings',
        },
      ],
    },
  },
  { _id: false },
);

const inventorySchema = new Schema<I_inventory>(
  {
    stock: { type: Number, min: 0, default: 0 },
    minStockThreshold: { type: Number, min: 0, default: 10 },
    preOrderLimit: { type: Number, default: 0 },
    preOrdersSold: { type: Number, default: 0 },
  },
  { _id: false },
);

const VariantSchema = new Schema<IProductVariant>({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true, unique: true, uppercase: true },

  selectedOptions: {
    type: Map,
    of: { type: String, trim: true },
    required: true,
    default: {},
    validate: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validator: function (m: any) {
          if (!m) return false;
          if (m instanceof Map) return m.size > 0;
          return typeof m === 'object' && Object.keys(m).length > 0;
        },
        message: 'selectedOptions must not be empty',
      },
    ],
  },

  priceBDT: { type: Number, required: true, min: 0 },
  oldPriceBDT: { type: Number, min: 0 },
  discountPercentage: { type: Number, min: 0, max: 100 },

  inventory: {
    type: inventorySchema,
    default: () => ({}),
  },

  image: { type: ImageSchema },
});

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },

    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },

    description: { type: String },
    videoReviewUrl: { type: String, trim: true },
    warranty: { type: String, trim: true },

    images: { type: [ImageSchema], default: [] },
    specifications: { type: Map, of: String, default: {} },

    options: { type: [ProductOptionSchema], default: [] },

    variants: {
      type: [VariantSchema],
      required: true,
      validate: [
        {
          validator: function (arr: unknown) {
            return Array.isArray(arr) && arr.length > 0;
          },
          message: 'At least one variant is required',
        },
      ],
    },

    adminNotes: { type: String },
    tags: { type: [String], default: [] },

    status: { type: String, enum: Object.values(PRODUCT_STATUS), default: PRODUCT_STATUS.Draft },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    seo: {
      seoTitle: { type: String },
      seoDescription: { type: String },
      canonicalUrl: { type: String },
    },

    defaultImage: { type: String },
    defaultPriceBDT: { type: Number },
    defaultVariantSku: { type: String },
  },
  { timestamps: true },
);

// Performance indexes
ProductSchema.index(
  { title: 'text', tags: 'text', 'variants.sku': 'text' },
  { weights: { title: 10, tags: 5, 'variants.sku': 2 } },
);
ProductSchema.index({ category: 1, isPublished: 1 });
ProductSchema.index({ verifiedBrandId: 1 });
ProductSchema.index({ 'variants.sku': 1 }, { unique: true });

// Soft-delete default filter
ProductSchema.pre(/^find/, function (next) {
  // @ts-expect-error mongoose internal
  const opts = this.getOptions?.() ?? {};

  if (!opts.withDeleted) {
    // @ts-expect-error mongoose internal
    this.where({ isDeleted: { $ne: true } });
  }

  next();
});

export const Product = mongoose.model<IProduct, TProductModel>('Product', ProductSchema);
