import { OrderModel } from '../Order/Order.model';
import { ProductModel } from '../products/product.model';
import { TransactionModel } from '../Payment-Related/Transaction/Transaction.model';
import { getDateRange, calculateChange } from './Analytics.utils';
import { ORDER_STATUS } from '../Order/Order.constant';
import { ISalesSummary, ISalesOverTime, ICategorySales, IRestockItem } from './Analytics.interface';

const getDashboardSummary = async (year?: number, month?: number): Promise<ISalesSummary> => {
  const currentRange = getDateRange(year, month);
  const prevMonthDate = new Date(currentRange.start);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevRange = getDateRange(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1);

  const getFinancials = async (range: { start: Date; end: Date }) => {
    const dateFilter = { createdAt: { $gte: range.start, $lte: range.end } };

    const [orderStats] = await OrderModel.aggregate([
      { $match: { ...dateFilter, status: { $ne: ORDER_STATUS.CANCELLED } } },
      {
        $group: {
          _id: null,
          gross: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          itemsSold: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]);

    const transactionStats = await TransactionModel.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const sales = transactionStats.find((t) => t._id === 'sale')?.total || 0;
    const refunds = transactionStats.find((t) => t._id === 'refund')?.total || 0;

    return {
      gross: orderStats?.gross || 0,
      net: sales - refunds,
      orderCount: orderStats?.count || 0,
      refundCount: transactionStats.find((t) => t._id === 'refund')?.total || 0,
      itemsSold: orderStats?.itemsSold || 0,
    };
  };

  const [current, previous] = await Promise.all([getFinancials(currentRange), getFinancials(prevRange)]);

  // Status breakdown for current month
  const statusAggregation = await OrderModel.aggregate([
    { $match: { createdAt: { $gte: currentRange.start, $lte: currentRange.end } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statusMap = statusAggregation.reduce((acc: any, curr) => {
    acc[curr._id.toLowerCase()] = curr.count;
    return acc;
  }, {});

  // Fetch top 5 orders with debt
  const dueOrders = await OrderModel.find({
    'paymentInfo.dueAmount': { $gt: 0 },
    isDeleted: false,
  })
    .sort({ 'paymentInfo.dueAmount': -1 })
    .limit(5)
    .select('orderId customerName paymentInfo.dueAmount')
    .lean();

  return {
    grossRevenue: {
      current: current.gross,
      previous: previous.gross,
      change: calculateChange(current.gross, previous.gross),
    },
    netRevenue: { current: current.net, previous: previous.net, change: calculateChange(current.net, previous.net) },
    totalOrders: {
      current: current.orderCount,
      previous: previous.orderCount,
      change: calculateChange(current.orderCount, previous.orderCount),
    },
    totalRefunds: {
      current: current.refundCount,
      previous: previous.refundCount,
      change: calculateChange(current.refundCount, previous.refundCount),
    },
    totalItemsSold: current.itemsSold,
    statusCounts: {
      pending: statusMap.pending || 0,
      confirmed: statusMap.confirmed || 0,
      shipped: statusMap.shipped || 0,
      delivered: statusMap.delivered || 0,
      cancelled: statusMap.cancelled || 0,
    },
    dueOrders: dueOrders.map((o) => ({
      orderId: o.orderId,
      customerName: o.customerName,
      amountDue: o.paymentInfo.dueAmount,
    })),
  };
};

const getRestockQueue = async (): Promise<IRestockItem[]> => {
  // Finds products where ANY variant is below threshold
  const products = await ProductModel.find({
    $expr: {
      $gt: [
        0,
        {
          $size: {
            $filter: {
              input: '$variants',
              as: 'v',
              cond: { $lte: ['$$v.inventory.stock', '$$v.inventory.minStockThreshold'] },
            },
          },
        },
      ],
    },
  })
    .populate('category', 'name')
    .lean();

  const queue: IRestockItem[] = [];
  products.forEach((p: any) => {
    p.variants.forEach((v: any) => {
      if (v.inventory.stock <= v.inventory.minStockThreshold) {
        queue.push({
          productId: p._id,
          title: p.title,
          sku: v.sku,
          currentStock: v.inventory.stock,
          threshold: v.inventory.minStockThreshold,
          category: p.category?.name || 'Uncategorized',
        });
      }
    });
  });

  return queue.sort((a, b) => a.currentStock - b.currentStock);
};

const getSalesByCategory = async (year?: number, month?: number): Promise<ICategorySales[]> => {
  const { start, end } = getDateRange(year, month);
  return await OrderModel.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: ORDER_STATUS.CANCELLED } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
    { $unwind: '$prod' },
    { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
    { $unwind: '$cat' },
    {
      $group: {
        _id: '$cat.name',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.itemTotal' },
      },
    },
    { $project: { _id: 0, category: '$_id', unitsSold: 1, revenue: 1 } },
    { $sort: { revenue: -1 } },
  ]);
};

export const AnalyticsServices = {
  getDashboardSummary,
  getRestockQueue,
  getSalesByCategory,
};
