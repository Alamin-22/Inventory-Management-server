import { Schema, Query, Document, Connection } from 'mongoose';
import { IAdmin, TAdminModel } from './admin.interface';
import { AdminPermissions } from './admin.constants';

const adminSchema = new Schema<IAdmin, TAdminModel>(
  {
    id: { type: String, required: true, unique: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
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

// Query Middleware to hide deleted admins
adminSchema.pre(/^find/, function (this: Query<IAdmin, Document>, next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

adminSchema.statics.isAdminExists = async function (id: string) {
  return await this.findOne({ id });
};

export const getAdminModel = (connection: Connection) => {
  if (connection.models.Admin) {
    return connection.models.Admin as TAdminModel;
  }
  return connection.model<IAdmin, TAdminModel>('Admin', adminSchema);
};
