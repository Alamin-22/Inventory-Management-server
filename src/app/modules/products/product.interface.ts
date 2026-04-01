import { Types } from 'mongoose';
import { TProductStatus } from './product.constants';

export interface IProductOption {
  name: string;
  values: string[];
}

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface I_inventory {
  stock: number;
  minStockThreshold: number;
  preOrderLimit: number;
  preOrdersSold: number;
}

export interface IProductVariant {
  name: string;
  sku: string;
  selectedOptions: Record<string, string>;

  priceBDT: number;
  oldPriceBDT?: number;
  discountPercentage?: number;

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
  category: Types.ObjectId;

  brand?: Types.ObjectId | null;

  description?: string;
  videoReviewUrl?: string;
  warranty?: string;
  images: IProductImage[];
  specifications?: Record<string, string>;

  options: IProductOption[];
  variants: IProductVariant[];

  adminNotes?: string;
  tags?: string[]; // for internal use like searching optimization

  status: TProductStatus;
  isPublished: boolean;
  isDeleted: boolean;

  defaultImage?: string;
  defaultPriceBDT?: number;
  defaultVariantSku?: string;

  seo?: IProductSEO;

  createdAt?: Date;
  updatedAt?: Date;
}
