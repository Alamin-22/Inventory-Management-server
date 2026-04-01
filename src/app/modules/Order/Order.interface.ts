import { Document, Types } from 'mongoose';
import { OrderStatus, PaymentStatus } from './Order.constant';

export interface IOrderItem {
  product: Types.ObjectId;
  variantId: Types.ObjectId;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
}

export interface IPaymentInfo {
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueAmount: number;
}

// The Audit Trail for the Order
export interface IOrderTimelineEvent {
  status: OrderStatus;
  title: string;
  description?: string;
  timestamp: Date;
  performedBy?: Types.ObjectId;
}

export interface IOrder extends Document {
  orderId: string;

  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: string;

  items: IOrderItem[];

  totalAmount: number;
  paymentInfo: IPaymentInfo;

  status: OrderStatus;

  orderHistory: IOrderTimelineEvent[];

  // who crated this order
  createdBy?: Types.ObjectId;

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
