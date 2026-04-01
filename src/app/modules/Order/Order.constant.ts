export const OrderSearchableFields = ['orderId', 'customerName', 'customerPhone'];

export const ORDER_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
} as const;

export const PAYMENT_STATUS = {
  UNPAID: 'Unpaid',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
