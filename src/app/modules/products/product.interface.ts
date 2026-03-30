import { Types } from 'mongoose';
import { TCurrency, TProductFulfillmentType, TProductSourceType, TProductStatus } from './product.constants';
import { TBrand } from '../auth/auth.interface';

// (e.g. "Color", "Size") actually this is the key(Options Name)
export interface IProductOption {
  name: string; // option name like Color
  values: string[]; /// multiple values under a single option like red,green,blue etc
}

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface I_inventory {
  stock: number;
  preOrderLimit: number;
  preOrdersSold: number;
}

export interface IProductVariant {
  name: string;
  sku: string;
  selectedOptions: Record<string, string>;

  // Pricing (variant-only)
  priceBDT: number;
  oldPriceBDT?: number;
  discountPercentage?: number;

  // Cross-border core
  fulfillmentType: TProductFulfillmentType;
  launchDate?: Date | null;
  deliveryEstimate?: string; // required for CROSS_BORDER (business rule)

  // External/source price
  sourcePrice?: number;
  sourceCurrency?: TCurrency;

  // Inventory (READY_TO_SHIP only)
  inventory: I_inventory;

  image?: IProductImage;
}

export interface IProductSEO {
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
}

export interface IProduct {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  storePreference: TBrand;
  category: Types.ObjectId;

  // Brand hybrid system
  brandForExternal?: string; // external string (for scraper/api)
  verifiedBrandId?: Types.ObjectId | null; // required for MANUAL inventory products

  description?: string;
  videoReviewUrl?: string;
  warranty?: string;
  images: IProductImage[];
  specifications?: Record<string, string>;

  // The Menu: "This product comes in Color and Size"
  options: IProductOption[];
  variants: IProductVariant[];

  // Workflow
  sourceType: TProductSourceType;
  sourceUrl?: string;
  sourceProductId?: string;
  requiresAdminVerification: boolean;
  adminNotes?: string;

  // Marketing
  badges?: Types.ObjectId[];
  frequentlyBoughtTogether?: Types.ObjectId[];
  tags?: string[];

  // Status
  status: TProductStatus;
  isPublished: boolean;
  isDeleted: boolean;

  searchHitCount?: number;

  // SEO
  seo?: IProductSEO;

  // Fast reads for listing
  defaultImage?: string;
  defaultPriceBDT?: number;
  defaultVariantSku?: string;
  bookingConfiguration: {
    allowPartialPayment: boolean; // Toggle for "Options A & B" vs "Option B Only"
    bookingFeePercentage: number; // The dynamic % (1% - 50%)
  };

  createdAt?: Date;
  updatedAt?: Date;
}
