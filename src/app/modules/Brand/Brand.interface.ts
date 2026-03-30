import { Document, Model, Types } from 'mongoose';
import { TBrand } from '../auth/auth.interface';

export interface IBrand extends Document {
  name: string;
  slug: string;
  logo?: {
    url: string;
    publicId: string;
  };
  description?: string;
  brandLabel?: Types.ObjectId;
  isPublished: boolean;
  storePreference: TBrand;
}

export type IBrandModel = Model<IBrand>;
