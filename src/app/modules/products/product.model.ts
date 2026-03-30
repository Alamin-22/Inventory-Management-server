import { Connection, Model, Schema } from 'mongoose';
import { I_inventory, IProduct, IProductImage, IProductOption, IProductVariant } from './product.interface';
import { CURRENCY, PRODUCT_FULFILLMENT_TYPE, PRODUCT_SOURCE_TYPE, PRODUCT_STATUS } from './product.constants';
import { storePreferenceConfig } from '../Order/Order.model';

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
      default: undefined, // avoid implicit [] default so validators actually catch missing/empty arrays
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
    stock: { type: Number, min: 0, default: 0 }, // Physical Stock
    preOrderLimit: { type: Number, default: 0 }, // 0 = Unlimited
    preOrdersSold: { type: Number, default: 0 },
  },
  { _id: false },
);

const VariantSchema = new Schema<IProductVariant>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },

    // Shopify-style dynamic selection
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
            // Map or plain object
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

    fulfillmentType: {
      type: String,
      enum: Object.values(PRODUCT_FULFILLMENT_TYPE),
      required: true,
    },
    launchDate: { type: Date, default: null },
    deliveryEstimate: { type: String, trim: true },

    sourcePrice: { type: Number, min: 0 },
    sourceCurrency: { type: String, enum: Object.values(CURRENCY) },

    inventory: {
      type: inventorySchema,
      default: () => ({}),
    },

    image: { type: ImageSchema },
  },
  // { _id: false }, it ensures a unique id which we are using for the url update so that sharing the product page with the variant selection will work properly.
);

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },

    searchHitCount: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    brandForExternal: { type: String, trim: true },
    verifiedBrandId: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },

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

    sourceType: {
      type: String,
      enum: Object.values(PRODUCT_SOURCE_TYPE),
      required: true,
    },
    sourceUrl: { type: String },
    sourceProductId: { type: String },
    requiresAdminVerification: { type: Boolean, default: false },
    adminNotes: { type: String },

    badges: { type: [Schema.Types.ObjectId], ref: 'Badge', default: [] },
    frequentlyBoughtTogether: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    tags: { type: [String], default: [] },

    status: { type: String, enum: Object.values(PRODUCT_STATUS), default: PRODUCT_STATUS.Draft },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    storePreference: storePreferenceConfig,

    seo: {
      seoTitle: { type: String },
      seoDescription: { type: String },
      canonicalUrl: { type: String },
    },

    bookingConfiguration: {
      allowPartialPayment: {
        type: Boolean,
        default: true,
      },
      bookingFeePercentage: {
        type: Number,
        default: 10,
        min: 1,
        max: 50,
      },
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
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ category: 1, isPublished: 1 });
ProductSchema.index({ verifiedBrandId: 1 });
ProductSchema.index({ 'variants.sku': 1 }, { unique: true });
ProductSchema.index({ sourceType: 1, requiresAdminVerification: 1 });

// Soft-delete default filter (can be bypassed with .setOptions({ withDeleted: true }))
ProductSchema.pre(/^find/, function (next) {
  // @ts-expect-error mongoose internal
  const opts = this.getOptions?.() ?? {};

  if (!opts.withDeleted) {
    // @ts-expect-error mongoose internal
    this.where({ isDeleted: { $ne: true } });
  }

  next();
});

export const getProductModel = (connection: Connection): TProductModel => {
  return (connection.models.Product as TProductModel) || connection.model<IProduct>('Product', ProductSchema);
};
