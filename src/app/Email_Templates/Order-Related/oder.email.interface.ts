export interface OrderItemForEmail {
  sku: string;
  title: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

export interface OrderConfirmedEmailParams {
  customerName: string;
  orderNumber: string;
  createdAt: Date;
  items: OrderItemForEmail[];
  total: number;
  paidAmount: number;
  dueAmount: number;
  shippingAddress: string;
  companyName: string;
  companyLogoUrl: string;
  supportEmail: string;
  supportPhone: string;
  customerEmail?: string;
  clientUrl: string;
  themeColor?: string;
}

export interface OrderStatusUpdateEmailParams {
  customerName: string;
  orderNumber: string;
  items: OrderItemForEmail[];
  updateTitle: string;
  updateMessage: string;
  companyName: string;
  companyLogoUrl: string;
  supportEmail: string;
  supportPhone: string;
  clientUrl: string;
  themeColor?: string;
}
