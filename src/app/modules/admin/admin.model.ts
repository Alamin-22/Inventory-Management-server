import mongoose, { Schema, Query, Document } from 'mongoose';
import { IAdmin, TAdminModel } from './admin.interface';
import { AdminPermissions } from './admin.constant';

const adminSchema = new Schema<IAdmin, TAdminModel>(
  {
    id: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contactNo: { type: String, required: true },

    profileImg: {
      url: { type: String },
      publicId: { type: String },
    },

    permissions: [
      {
        type: String,
        enum: Object.values(AdminPermissions),
      },
    ],

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

adminSchema.pre(/^find/, function (this: Query<IAdmin, Document>, next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

adminSchema.statics.isAdminExists = async function (id: string) {
  return await this.findOne({ id });
};

export const Admin = mongoose.model<IAdmin, TAdminModel>('Admin', adminSchema);
