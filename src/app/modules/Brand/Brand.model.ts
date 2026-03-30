import { Connection, Schema } from 'mongoose';
import { IBrand, IBrandModel } from './Brand.interface';
import { slugify } from '@utils/slugGenerator';
import { storePreferenceConfig } from '../Order/Order.model';

const brandSchema = new Schema<IBrand>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true },
  logo: { url: { type: String }, publicId: { type: String } },
  description: { type: String },
  brandLabel: { type: Schema.Types.ObjectId, ref: 'Category' },
  isPublished: { type: Boolean, default: true },
  storePreference: storePreferenceConfig,
});

// Auto-generate slug from the brand name
brandSchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
  next();
});

export const getBrandModel = (connection: Connection): IBrandModel => {
  if (connection.models.Brand) {
    return connection.models.Brand as IBrandModel;
  }
  return connection.model<IBrand, IBrandModel>('Brand', brandSchema);
};
