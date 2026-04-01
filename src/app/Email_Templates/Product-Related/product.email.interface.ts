export interface StockNotificationEmailParams {
  sku: string;
  productTitle: string;
  companyName: string;
  companyLogoUrl: string;
  currentQty: number;
  threshold: number;
  clientUrl?: string;
}
