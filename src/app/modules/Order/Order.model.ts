/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection, Model, Query, Schema, Aggregate } from 'mongoose';
import { IAddress, IOrder, IOrderItem, IOrderTimelineEvent, IPaymentInfo } from './Order.interface';
import { orderStatusEnum } from './Order.constant';

export type TOrderModel = Model<IOrder>;

const OrderTimelineSchema = new Schema<IOrderTimelineEvent>(
  {
    status: { type: String, enum: orderStatusEnum, required: true },
    title: { type: String, required: true },
    description: { type: String },
    location: { type: String },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    groupBuyId: { type: Schema.Types.ObjectId, ref: 'GroupBuy' },
    isGroupBuyItem: { type: Boolean, default: false },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
    proratedDiscount: { type: Number, default: 0 },
    netPrice: { type: Number },
    fulfillmentType: {
      type: String,
      enum: ['READY_TO_SHIP', 'CROSS_BORDER'],
      default: 'READY_TO_SHIP',
    },
  },
  { _id: false },
);

const AddressSchema = new Schema<IAddress>(
  {
    name: { type: String, required: true },
    street1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false },
);

const PaymentInfoSchema = new Schema<IPaymentInfo>(
  {
    paymentType: {
      type: String,
      enum: ['full', 'partial', 'remaining', 'refunded'],
    },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    bookingPercentageAtPurchase: { type: Number, default: 10 },
  },
  { _id: false },
);

export const storePreferenceConfig = {
  type: String,
  required: true,
  enum: ['bringByAir', 'pandaBD'],
  index: true,
};

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    storePreference: storePreferenceConfig,
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: String },
    email: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true },

    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    customDiscountAmount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    couponCode: { type: String },
    paymentInfo: {
      type: PaymentInfoSchema,
      default: { paidAmount: 0, dueAmount: 0, bookingPercentageAtPurchase: 10 },
    },

    billingAddress: { type: AddressSchema },
    shippingAddress: { type: AddressSchema, required: true },
    orderNote: { type: String },

    fulfillmentStatus: {
      type: String,
      enum: orderStatusEnum,
      default: 'awaiting-payment',
    },
    orderType: {
      type: String,
      enum: ['standard', 'pre-order', 'group-buy'],
      default: 'standard',
      required: true,
    },

    orderHistory: {
      type: [OrderTimelineSchema],
      default: [],
    },
    cancelToken: { type: String, unique: true, sparse: true },
    deliveredAt: { type: Date },
    orderExpireAt: { type: Date },
    reminderSent: { type: Boolean, default: false },
    finalReminderSent: { type: Boolean, default: false },
    abandonedReminderSent: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

OrderSchema.index({ orderNumber: 1, storePreference: 1 }, { unique: true });
OrderSchema.index({ user: 1, storePreference: 1 });

/**
 * TTL: 10-Minute Cleanup for Orphaned Group Buy Joins
 * Automatically deletes the document if it remains in 'group-buy-pending' for 10 minutes.
 * Calculation: 10 * 60 = 600 seconds.
 */
OrderSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 600,
    partialFilterExpression: { fulfillmentStatus: 'group-buy-pending' },
  },
);

/**
 * --- MIDDLEWARE: SOFT DELETE ---
 * Automatically filters out isDeleted: true from all find and aggregate queries.
 */
OrderSchema.pre<Query<any, IOrder>>(/^find/, function (next) {
  const filter = this.getFilter();
  if (!Object.prototype.hasOwnProperty.call(filter, 'isDeleted')) {
    this.where({ isDeleted: false });
  }
  next();
});

OrderSchema.pre('aggregate', function (this: Aggregate<IOrder>, next) {
  const pipeline = this.pipeline();
  const hasIsDeletedMatch = pipeline.some(
    (stage) =>
      '$match' in stage && Object.prototype.hasOwnProperty.call((stage as { $match: unknown }).$match, 'isDeleted'),
  );
  if (!hasIsDeletedMatch) {
    pipeline.unshift({ $match: { isDeleted: false } });
  }
  next();
});

export const getOrderModel = (connection: Connection): TOrderModel => {
  return (connection.models.Order as TOrderModel) || connection.model<IOrder>('Order', OrderSchema);
};
