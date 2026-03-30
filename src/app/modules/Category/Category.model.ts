import mongoose, { Schema, Query, Document } from 'mongoose';
import { ICategory, TCategoryModel } from './Category.interface';
import { slugGenerator } from '@utils/slugGenerator';

const categorySchema = new Schema<ICategory, TCategoryModel>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    order: { type: Number, default: 0, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugGenerator(this.name);
  }
  next();
});

categorySchema.pre(/^find/, function (this: Query<ICategory, Document>, next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

export const Category = mongoose.model<ICategory, TCategoryModel>('Category', categorySchema);
