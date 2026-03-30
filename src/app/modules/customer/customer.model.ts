import { Query, Schema, Document, Connection } from 'mongoose';
import { ICustomer, TCustomerModel } from './customer.interface';

const addressSchema = new Schema(
  {
    address: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
  },
  { _id: false },
);

const customerSchema = new Schema<ICustomer, TCustomerModel>(
  {
    id: { type: String, required: true, unique: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    contactNo: { type: String },
    profileImg: {
      url: { type: String },
      publicId: { type: String },
    },
    storePreference: {
      type: String,
      enum: ['bringByAir', 'pandaBD'],
      default: 'bringByAir',
    },

    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

// Query Middleware to hide deleted customers
customerSchema.pre(/^find/, function (this: Query<ICustomer, Document>, next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

customerSchema.statics.isCustomerExists = async function (id: string) {
  return await this.findOne({ id });
};

export const getCustomerModel = (connection: Connection) => {
  if (connection.models.Customer) {
    return connection.models.Customer as TCustomerModel;
  }
  return connection.model<ICustomer, TCustomerModel>('Customer', customerSchema);
};
