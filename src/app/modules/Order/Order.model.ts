/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Model, Query, Schema, Aggregate } from 'mongoose';
import { IOrder, IOrderItem, IOrderTimelineEvent, IPaymentInfo } from './Order.interface';
import { ORDER_STATUS, PAYMENT_STATUS } from './Order.constant';

export type TOrderModel = Model<IOrder>;

const OrderTimelineSchema = new Schema<IOrderTimelineEvent>(
  {
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unitPrice: { type: Number, required: true, min: 0 },
    itemTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

// Payment Ledger Snapshot Schema
const PaymentInfoSchema = new Schema<IPaymentInfo>(
  {
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID,
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },

    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    shippingAddress: { type: String, trim: true },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [
        {
          validator: function (items: IOrderItem[]) {
            return items.length > 0;
          },
          message: 'An order must contain at least one item.',
        },
      ],
    },

    totalAmount: { type: Number, required: true, min: 0 },

    paymentInfo: {
      type: PaymentInfoSchema,
      required: true,
      default: () => ({ paymentStatus: PAYMENT_STATUS.UNPAID, paidAmount: 0, dueAmount: 0 }),
    },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },

    orderHistory: {
      type: [OrderTimelineSchema],
      default: [],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Performance Indexes optimized for Dashboard Queries
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'paymentInfo.paymentStatus': 1 });
OrderSchema.index({ createdAt: -1 });

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

export const OrderModel = mongoose.model<IOrder, TOrderModel>('Order', OrderSchema);
