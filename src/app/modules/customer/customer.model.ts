import mongoose, { Query, Schema, Document } from 'mongoose';
import { ICustomer, TCustomerModel } from './customer.interface';

const addressSchema = new Schema(
  {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' },
  },
  { _id: false },
);

const customerSchema = new Schema<ICustomer, TCustomerModel>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: 'Walk-in Customer' },
    contactNo: { type: String, required: true, unique: true },
    email: { type: String, sparse: true },

    customerType: { type: String, enum: ['retail', 'wholesale', 'corporate'], default: 'retail' },
    companyName: { type: String },
    taxId: { type: String },

    billingAddress: { type: addressSchema, default: () => ({}) },
    shippingAddress: { type: addressSchema, default: () => ({}) },

    totalOrders: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

customerSchema.pre(/^find/, function (this: Query<ICustomer, Document>, next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

customerSchema.statics.isCustomerExists = async function (id: string) {
  return await this.findOne({ id });
};

export const Customer = mongoose.model<ICustomer, TCustomerModel>('Customer', customerSchema);
