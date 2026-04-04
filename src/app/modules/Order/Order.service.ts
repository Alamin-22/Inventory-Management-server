import httpStatus from 'http-status';
import { ClientSession, startSession, Types } from 'mongoose';
import { AppError } from '@app/classes/AppError';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { IOrder, IOrderItem } from './Order.interface';
import { ORDER_STATUS, OrderSearchableFields, OrderStatus, PAYMENT_STATUS, PaymentStatus } from './Order.constant';
import { _decrementStockAndNotify, _restockItems, generateOrderId } from './Order.utils';
import { OrderRelatedEmails } from './Order.email';
import { OrderModel } from './Order.model';
import { ProductModel } from '../products/product.model';
import { PRODUCT_STATUS } from '../products/product.constants';
import { IProductVariant } from '../products/product.interface';

// --- CREATE ORDER ---
const createOrderIntoDB = async (payload: Partial<IOrder>, adminId?: string, pdfBuffer?: Buffer) => {
  if (!payload.items || payload.items.length === 0) {
    throw new AppError('Order must contain at least one item.', httpStatus.BAD_REQUEST);
  }

  // Conflict Detection: Prevent duplicate variant entries in the payload
  const variantIds = payload.items.map((item) => item.variantId.toString());
  if (new Set(variantIds).size !== variantIds.length) {
    throw new AppError('This product is already added to the order.', httpStatus.BAD_REQUEST);
  }

  const session: ClientSession = await startSession();
  let createdOrder = null;

  try {
    session.startTransaction();

    let totalAmount = 0;
    const processedItems: IOrderItem[] = [];

    // 1. Initial Validation & Financial Snapshot Loop
    for (const item of payload.items) {
      const productDoc = await ProductModel.findById(item.product).session(session);

      // Conflict Detection: Prevent ordering inactive products
      if (!productDoc || !productDoc.isPublished || productDoc.status !== PRODUCT_STATUS.Active) {
        throw new AppError('This product is currently unavailable.', httpStatus.BAD_REQUEST);
      }

      const variant = productDoc.variants.find(
        (v: IProductVariant) => v._id?.toString() === item.variantId?.toString(),
      );
      if (!variant) {
        throw new AppError(`Specific variant not found for ${productDoc.title}.`, httpStatus.BAD_REQUEST);
      }

      const currentStock = variant.inventory?.stock || 0;
      if (currentStock < item.quantity) {
        throw new AppError(`Only ${currentStock} items available in stock`, httpStatus.BAD_REQUEST);
      }

      // Snapshot Financials
      const unitPrice = variant.priceBDT;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        product: productDoc._id as Types.ObjectId,
        variantId: variant._id as Types.ObjectId,
        sku: variant.sku,
        name: variant.name || productDoc.title,
        quantity: item.quantity,
        unitPrice,
        itemTotal,
      });
    }

    await _decrementStockAndNotify(processedItems, ProductModel, session);

    //  Build POS Order Ledger
    const initialStatus = payload.status || ORDER_STATUS.CONFIRMED;
    const orderId = generateOrderId();

    // Determine initial payment values
    const paidAmount = payload.paymentInfo?.paidAmount || 0;
    const dueAmount = totalAmount - paidAmount;

    let paymentStatus: PaymentStatus = PAYMENT_STATUS.UNPAID;
    if (paidAmount > 0 && dueAmount > 0) paymentStatus = PAYMENT_STATUS.PARTIAL;
    if (dueAmount <= 0) paymentStatus = PAYMENT_STATUS.PAID;

    const orderData: Partial<IOrder> = {
      orderId,
      customerName: payload.customerName || 'Walk-in Customer',
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail === '' ? undefined : payload.customerEmail,
      shippingAddress: payload.shippingAddress || 'In-Store POS',
      items: processedItems,
      totalAmount,
      paymentInfo: {
        paidAmount,
        dueAmount,
        paymentStatus,
      },
      status: initialStatus,
      createdBy: adminId ? new Types.ObjectId(adminId) : undefined,
      orderHistory: [
        {
          status: initialStatus,
          title: 'Order Created via POS',
          description: 'Order placed, payment processed, and stock deducted.',
          timestamp: new Date(),
          performedBy: adminId ? new Types.ObjectId(adminId) : undefined,
        },
      ],
    };

    const orders = await OrderModel.create([orderData], { session });
    createdOrder = orders[0];

    await session.commitTransaction();

    // Fire Instant POS Invoice (Non-Blocking)
    OrderRelatedEmails.sendOrderReceiptToCustomer(createdOrder, ProductModel, pdfBuffer).catch(console.error);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return createdOrder;
};

// --- CONFIRM ORDER (Manual overrides/Shipping fees) ---
const confirmOrderByAdmin = async (payload: {
  orderId: string;
  shippingFee?: number;
  discount?: number;
  adminId: string;
}) => {
  const { orderId, shippingFee = 0, discount = 0, adminId } = payload;

  const order = await OrderModel.findOne({ orderId, isDeleted: false });
  if (!order) throw new AppError(`Order ${orderId} not found.`, httpStatus.NOT_FOUND);

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new AppError(`Order is already ${order.status} and cannot be confirmed again.`, httpStatus.BAD_REQUEST);
  }

  const baseTotal = order.items.reduce((sum, item) => sum + item.itemTotal, 0);
  order.totalAmount = Math.max(0, baseTotal + shippingFee - discount);

  order.paymentInfo.dueAmount = order.totalAmount - order.paymentInfo.paidAmount;
  if (order.paymentInfo.dueAmount <= 0) {
    order.paymentInfo.paymentStatus = PAYMENT_STATUS.PAID;
  }

  order.status = ORDER_STATUS.CONFIRMED;

  order.orderHistory.push({
    status: ORDER_STATUS.CONFIRMED,
    title: 'Order Confirmed',
    description: `Admin confirmed order. Shipping: ${shippingFee}, Discount: ${discount}`,
    timestamp: new Date(),
    performedBy: new Types.ObjectId(adminId),
  });

  await order.save();

  OrderRelatedEmails.sendOrderStatusUpdateEmail(
    order,
    ProductModel,
    'Order Confirmed',
    'Your order has been reviewed and confirmed. It is now being processed for delivery.',
  ).catch(console.error);

  return order;
};

// ---  UPDATE STATUS & RESTOCK LOGIC ---
const updateOrderStatusByAdmin = async (
  orderId: string,
  newStatus: OrderStatus,
  adminId: string,
  notes?: string,
  notifyCustomer: boolean = false,
) => {
  const order = await OrderModel.findOne({ orderId, isDeleted: false });
  if (!order) throw new AppError(`Order ${orderId} not found.`, httpStatus.NOT_FOUND);

  if (order.status === ORDER_STATUS.CANCELLED) {
    throw new AppError(`Order ${orderId} is already cancelled.`, httpStatus.BAD_REQUEST);
  }

  const session = await startSession();
  try {
    session.startTransaction();

    if (newStatus === ORDER_STATUS.CANCELLED) {
      await _restockItems(order.items, ProductModel, session);
    }

    order.status = newStatus;
    order.orderHistory.push({
      status: newStatus,
      title: `Status updated to ${newStatus}`,
      description: notes || `Order status manually updated.`,
      timestamp: new Date(),
      performedBy: new Types.ObjectId(adminId),
    });

    await order.save({ session });
    await session.commitTransaction();

    if (notifyCustomer) {
      OrderRelatedEmails.sendOrderStatusUpdateEmail(
        order,
        ProductModel,
        `Order ${newStatus}`,
        notes || `Your order status has been updated to ${newStatus}.`,
      ).catch(console.error);
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getAllOrdersFromDB = async (query: Record<string, unknown>) => {
  const ordersQuery = new QueryBuilder(OrderModel, query)
    .search(OrderSearchableFields)
    .filter()
    .sort()
    .paginate()
    .limitFields();

  const rawOrders = await ordersQuery.exec();
  const meta = await ordersQuery.getQueryMeta();

  const result = await OrderModel.populate(rawOrders, {
    path: 'items.product',
    model: ProductModel,
    select: 'title defaultImage category brand',
  });

  return { meta, result };
};

const getSingleOrderFromDB = async (orderId: string) => {
  const order = await OrderModel.findOne({ orderId, isDeleted: false })
    .populate({
      path: 'items.product',
      model: ProductModel,
      select: 'title defaultImage category brand',
    })
    .lean();

  if (!order) throw new AppError('Order not found', httpStatus.NOT_FOUND);

  // Sort History newest first
  if (order.orderHistory && Array.isArray(order.orderHistory)) {
    order.orderHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  return order;
};

// --- ARCHIVE & DELETION ---
const deleteOrderByAdmin = async (orderId: string) => {
  const order = await OrderModel.findOne({ orderId, isDeleted: false });
  if (!order) throw new AppError(`Order ${orderId} not found.`, httpStatus.NOT_FOUND);

  if (order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.DELIVERED) {
    throw new AppError(
      `Cannot archive a ${order.status} order. Please cancel the order first to return stock to inventory.`,
      httpStatus.BAD_REQUEST,
    );
  }

  order.isDeleted = true;
  return await order.save();
};

const getArchivedOrdersFromDB = async (query: Record<string, unknown>) => {
  const archivedQuery = { ...query, isDeleted: true, withDeleted: true };

  const ordersQuery = new QueryBuilder(OrderModel, archivedQuery)
    .search(OrderSearchableFields)
    .filter()
    .sort()
    .paginate()
    .limitFields();

  const rawOrders = await ordersQuery.exec();
  const meta = await ordersQuery.getQueryMeta();

  const result = await OrderModel.populate(rawOrders, {
    path: 'items.product',
    model: ProductModel,
    select: 'title defaultImage category brand',
  });

  return { meta, result };
};

const deleteArchivedOrdersPermanentlyFromDB = async (ids: string[]) => {
  return await OrderModel.deleteMany({ _id: { $in: ids }, isDeleted: true });
};

export const OrderServices = {
  createOrderIntoDB,
  confirmOrderByAdmin,
  updateOrderStatusByAdmin,
  getAllOrdersFromDB,
  getSingleOrderFromDB,
  deleteOrderByAdmin,
  getArchivedOrdersFromDB,
  deleteArchivedOrdersPermanentlyFromDB,
};
