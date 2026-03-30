import { Model } from 'mongoose';

export interface ICategory {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  parentCategory?: string; // Optional for nested categories
  categoryImage?: {
    url: string;
    publicId: string;
  };
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
  isFeatured?: boolean;
}

export type ICategoryModel = Model<ICategory>; // Empty = type safety
