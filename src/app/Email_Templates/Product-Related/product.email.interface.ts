export interface StockNotificationEmailParams {
  sku: string;
  productTitle: string;
  adminDashboardLink: string;
  companyName: string;
  companyLogoUrl: string;
}

export interface LowStockNotificationEmailParams extends StockNotificationEmailParams {
  currentQty: number;
  threshold: number;
}

export interface BackInStockEmailParams {
  customerName: string;
  productTitle: string;
  productImageUrl: string;
  productUrl: string;
  variantSku: string;
  companyName: string;
  companyLogoUrl: string;
  supportEmail: string;
}
