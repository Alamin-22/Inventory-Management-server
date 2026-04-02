import { OrderModel } from '../Order/Order.model';
import { ProductModel } from '../products/product.model';
import { TransactionModel } from '../Payment-Related/Transaction/Transaction.model';
import { ORDER_STATUS } from '../Order/Order.constant';
import { calculateChange, getDateRange } from './Analytics.utils';
import { IDashboardSummary, IRestockItem, IInventoryAlerts } from './Analytics.interface';

const getDashboardSummary = async (year?: number, month?: number): Promise<IDashboardSummary> => {
  const currentRange = getDateRange(year, month);
  const prevMonthDate = new Date(currentRange.start);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevRange = getDateRange(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1);

  const fetchPeriodMetrics = async (range: { start: Date; end: Date }) => {
    const filter = { createdAt: { $gte: range.start, $lte: range.end }, isDeleted: false };

    const [orderMetrics] = await OrderModel.aggregate([
      { $match: { ...filter, status: { $ne: ORDER_STATUS.CANCELLED } } },
      {
        $group: {
          _id: null,
          gross: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const transactionMetrics = await TransactionModel.aggregate([
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const sales = transactionMetrics.find((t) => t._id === 'sale')?.total || 0;
    const refunds = transactionMetrics.find((t) => t._id === 'refund')?.total || 0;

    return {
      gross: orderMetrics?.gross || 0,
      net: sales - refunds,
      count: orderMetrics?.count || 0,
    };
  };

  const [current, previous] = await Promise.all([fetchPeriodMetrics(currentRange), fetchPeriodMetrics(prevRange)]);

  // FIXED: Aggregation keys now match IInventoryAlerts interface
  const inventoryStats: IInventoryAlerts[] = await ProductModel.aggregate([
    { $match: { isDeleted: false } },
    { $unwind: '$variants' },
    {
      $group: {
        _id: null,
        totalVariants: { $sum: 1 },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$variants.inventory.stock', 0] }, 1, 0] },
        },
        lowStockCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$variants.inventory.stock', 0] },
                  { $lte: ['$variants.inventory.stock', '$variants.inventory.minStockThreshold'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const inv = inventoryStats[0] || { totalVariants: 0, outOfStockCount: 0, lowStockCount: 0 };

  const statusStats = await OrderModel.aggregate([
    { $match: { createdAt: { $gte: currentRange.start, $lte: currentRange.end }, isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statusMap: Record<string, number> = {};
  statusStats.forEach((s) => {
    statusMap[s._id.toLowerCase()] = s.count;
  });

  const dueOrders = await OrderModel.find({
    'paymentInfo.dueAmount': { $gt: 0 },
    status: { $ne: ORDER_STATUS.CANCELLED },
  })
    .sort({ 'paymentInfo.dueAmount': -1 })
    .limit(5)
    .select('orderId customerName paymentInfo.dueAmount')
    .lean();

  return {
    netRevenue: {
      current: current.net,
      previous: previous.net,
      change: calculateChange(current.net, previous.net),
    },
    grossSales: {
      current: current.gross,
      previous: previous.gross,
      change: calculateChange(current.gross, previous.gross),
    },
    orderCount: {
      current: current.count,
      previous: previous.count,
      change: calculateChange(current.count, previous.count),
    },
    inventoryAlerts: inv, // Now matches the interface keys perfectly
    statusCounts: statusMap,
    topDebtors: dueOrders.map((o) => ({
      orderId: o.orderId,
      customerName: o.customerName,
      amountDue: o.paymentInfo.dueAmount,
    })),
  };
};

const getRestockQueue = async (): Promise<IRestockItem[]> => {
  return (await ProductModel.aggregate([
    { $match: { isDeleted: false, isPublished: true } },

    { $unwind: '$variants' },

    {
      $match: {
        $expr: { $lte: ['$variants.inventory.stock', '$variants.inventory.minStockThreshold'] },
      },
    },

    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 0,
        productId: '$_id',
        productTitle: '$title',
        variantName: '$variants.name',
        sku: '$variants.sku',
        currentStock: '$variants.inventory.stock',
        threshold: '$variants.inventory.minStockThreshold',
        category: '$cat.name',
        // Priority Logic:
        // - 0 Stock = High
        // - 1-5 Stock = Medium
        // - Above 5 (but below threshold) = Low
        priority: {
          $cond: [
            { $eq: ['$variants.inventory.stock', 0] },
            'High',
            {
              $cond: [{ $lte: ['$variants.inventory.stock', 5] }, 'Medium', 'Low'],
            },
          ],
        },
      },
    },

    { $sort: { currentStock: 1 } },
  ])) as IRestockItem[];
};

export const AnalyticsServices = {
  getDashboardSummary,
  getRestockQueue,
};
