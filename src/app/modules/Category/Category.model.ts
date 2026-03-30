import { Connection, Schema } from 'mongoose';
import { ICategory, ICategoryModel } from './Category.interface';

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    categoryImage: { url: { type: String }, publicId: { type: String } },
    order: { type: Number, default: 0, indexes: true }, // Lower numbers show first| used for drag & drop feature
    isFeatured: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  },
);

export const getCategoryModel = (connection: Connection): ICategoryModel => {
  if (connection.models.Category) {
    return connection.models.Category as ICategoryModel;
  }
  return connection.model<ICategory, ICategoryModel>('Category', categorySchema);
};
