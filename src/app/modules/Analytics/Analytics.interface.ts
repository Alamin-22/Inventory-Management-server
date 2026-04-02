export type TComparisonMetric = {
  current: number;
  previous: number;
  change: number;
};

export interface IDueOrder {
  orderId: string;
  customerName: string;
  amountDue: number;
}

export interface IInventoryAlerts {
  totalVariants: number;
  lowStockCount: number; // stock > 0 && stock <= threshold
  outOfStockCount: number; // stock == 0
}

export interface IDashboardSummary {
  netRevenue: TComparisonMetric; // Transactions: (Sales - Refunds)
  grossSales: TComparisonMetric; // Orders: Sum of totalAmount
  orderCount: TComparisonMetric; // Count of non-cancelled orders
  inventoryAlerts: IInventoryAlerts;
  statusCounts: Record<string, number>;
  topDebtors: IDueOrder[];
}

export interface IRestockItem {
  productId: string;
  productTitle: string;
  variantName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  category: string;
}

export interface ICategoryRevenue {
  category: string;
  revenue: number;
  unitsSold: number;
}
