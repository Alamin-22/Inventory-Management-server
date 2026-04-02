export type ComparisonMetric = {
  current: number;
  previous: number;
  change: number;
};

export interface IDueOrder {
  orderId: string;
  customerName: string;
  amountDue: number;
}

export interface ISalesSummary {
  grossRevenue: ComparisonMetric; // Sum of all order totals (excluding cancelled)
  netRevenue: ComparisonMetric; // Real cash (Sales - Refunds)
  totalOrders: ComparisonMetric; // Order count
  totalRefunds: ComparisonMetric; // Refund count/value
  totalItemsSold: number;
  statusCounts: {
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  dueOrders: IDueOrder[];
}

export interface ISalesOverTime {
  _id: string; // Date string
  revenue: number;
  orders: number;
}

export interface ICategorySales {
  category: string;
  unitsSold: number;
  revenue: number;
}

export interface IRestockItem {
  productId: string;
  title: string;
  sku: string;
  currentStock: number;
  threshold: number;
  category: string;
}
