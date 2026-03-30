import { Document, Types } from 'mongoose';
import { OrderStatus } from './Order.constant';
import { TBrand } from '../auth/auth.interface';

export interface IOrderItem {
  product: Types.ObjectId;
  groupBuyId?: Types.ObjectId;
  isGroupBuyItem?: boolean;
  sku: string;
  quantity: number;
  priceAtPurchase: number;
  proratedDiscount?: number;
  netPrice?: number;
  fulfillmentType?: 'READY_TO_SHIP' | 'CROSS_BORDER';
}

export interface IAddress {
  name: string;
  street1: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface IPaymentInfo {
  paymentType?: 'full' | 'partial' | 'remaining' | 'refunded';
  paidAmount: number;
  dueAmount: number;
  bookingPercentageAtPurchase?: number;
}


export interface IOrderTimelineEvent {
  status: OrderStatus;

  title: string; // e.g. "Arrived at Taiwan Airport"
  description?: string; // e.g. "Flight CX202 - Ready for dispatch"
  location?: string; // e.g. "Taipei, Taiwan"

  timestamp: Date;
  performedBy?: Types.ObjectId; // Admin ID who added this update
}

export interface IOrder extends Document {
  orderNumber: string;

  storePreference: TBrand;

  user?: Types.ObjectId;
  guestId?: string;
  email: string;
  items: IOrderItem[];

  subtotal: number;
  tax?: number;
  shippingFee?: number;
  total: number;

  discountAmount: number;
  customDiscountAmount?: number;
  couponCode: string;

  paymentInfo: IPaymentInfo;
  orderNote?: string;

  billingAddress?: IAddress;
  shippingAddress: IAddress;

  fulfillmentStatus: OrderStatus;
  orderType: 'standard' | 'pre-order' | 'group-buy';

  orderHistory: IOrderTimelineEvent[];
  cancelToken: string | undefined;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  orderExpireAt?: Date;
  reminderSent?: boolean;
  finalReminderSent?: boolean;
  abandonedReminderSent?: boolean;
}
