export interface OrderConfirmedEmailParams {
  customerName: string;
  orderNumber: string;
  userOrGuestId: string;
  createdAt: Date;
  items: Array<{
    sku: string;
    title: string;
    quantity: number;
    price: number;
    imageUrl: string;
  }>;
  subtotal: number;
  discountAmount: number;
  customDiscountAmount: number; // this will be added by only admin while confirming the order
  taxAmount: number;
  shippingFee: number;
  total: number;
  overrideNoteHtml?: string;
  shippingAddress: {
    name: string;
    street1: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  minAmountToPay: number;
  supportEmail: string;
  supportPhone: string;
  userEmail: string;
  companyName: string;
  companyLogoUrl: string;
  paymentUrl: string;
  cancelLink: string;
}

export interface PreOrderConfirmedEmailParams extends OrderConfirmedEmailParams {
  releaseDate: Date | null | string;
}

export interface AbandonedCartEmailParams {
  customerName: string;
  orderNumber: string;
  createdAt: Date;
  items: Array<{
    sku: string;
    title: string;
    quantity: number;
    price: number;
    imageUrl: string;
  }>;
  subtotal: number;
  discountAmount?: number;
  customDiscountAmount?: number;
  taxAmount?: number;
  shippingFee?: number;
  total: number;
  checkoutLink: string;
  supportEmail: string;
  supportPhone: string;
  userEmail: string;
  companyName: string;
  companyLogoUrl: string;
  themeColor: string;
}

export interface ReminderToCheckoutEmailParams {
  customerName: string;
  orderNumber: string;
  userOrGuestId: string;
  createdAt: Date;
  items: Array<{
    sku: string;
    title: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  discountAmount: number;
  customDiscountAmount?: number;
  taxAmount: number;
  shippingFee: number;
  total: number;
  checkOutLink: string;
  overrideNoteHtml?: string;
  shippingAddress: {
    name: string;
    street1: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  supportEmail: string;
  supportPhone: string;
  userEmail: string;
  companyName: string;
  companyLogoUrl: string;
  cancelLink: string;
  expiryDate: Date;
  minAmountToPay?: number;
  paidAmount?: number;
  dueAmount?: number;
  themeColor: string;
}

export interface OrderExpiredEmailParams {
  customerName: string;
  orderNumber: string;
  userOrGuestId: string;
  createdAt: Date;
  items: Array<{
    title: string;
    sku: string;
    quantity: number;
    price: number;
    imageUrl: string;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingFee: number;
  total: number;
  shippingAddress: {
    name: string;
    street1: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  supportEmail: string;
  supportPhone: string;
  userEmail: string;
  companyName: string;
  companyLogoUrl: string;
  expiryDate: Date;
  reorderLink: string;
}

export interface OrderConfirmedEmailParams {
  customerName: string;
  orderNumber: string;
  userOrGuestId: string;
  createdAt: Date;
  items: Array<{
    sku: string;
    title: string;
    quantity: number;
    price: number;
    imageUrl: string;
  }>;
  subtotal: number;
  discountAmount: number;
  customDiscountAmount: number; // this will be added by only admin while confirming the order
  taxAmount: number;
  shippingFee: number;
  total: number;
  overrideNoteHtml?: string;
  shippingAddress: {
    name: string;
    street1: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  supportEmail: string;
  supportPhone: string;
  userEmail: string;
  companyName: string;
  companyLogoUrl: string;
  paymentUrl: string;
  cancelLink: string;
  themeColor?: string;
}

export interface AdminNewOrderEmailParams {
  orderNumber: string;
  userOrGuestId: string;
  customerName: string;
  orderDate: Date | string;
  total: number;
  itemCount: number;
  adminDashboardLink: string;
  companyName: string;
  companyLogoUrl: string;
  themeColor?: string;
}

interface Address {
  name: string;
  street1: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface OrderItemForEmail {
  sku: string;
  title: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

export interface OrderSubmittedEmailParams {
  customerName: string;
  orderNumber: string;
  userOrGuestId: string;
  userEmail: string;
  createdAt: Date;
  items: OrderItemForEmail[];
  subtotal: number;
  discountAmount: number;
  total: number;
  shippingAddress: Address;
  supportEmail?: string;
  supportPhone?: string;
  companyName: string;
  companyLogoUrl: string;
  orderTrackingLink: string;
  themeColor?: string;
}

export interface OrderStatusUpdateEmailParams {
  customerName: string;
  orderNumber: string;
  userOrGuestId: string;
  items: OrderItemForEmail[];
  updateTitle: string;
  updateMessage: string;
  companyName: string;
  companyLogoUrl: string;
  supportEmail: string;
  supportPhone: string;
  orderTrackingLink: string;
  themeColor?: string;
}
