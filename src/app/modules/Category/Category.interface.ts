import { Model, Types } from 'mongoose';

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentCategory?: Types.ObjectId; // For nested sub-categories
  order: number; // For drag-and-drop sorting in the UI
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TCategoryModel extends Model<ICategory> {
  // eslint-disable-next-line no-unused-vars
  isCategoryExists(name: string): Promise<ICategory | null>;
}
