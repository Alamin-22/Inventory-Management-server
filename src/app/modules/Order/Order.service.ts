/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { getOrderModel } from './Order.model';
import { getCartModel } from '../Cart/Cart.model';
import { getProductModel } from '../products/product.model';
import { ClientSession, Connection, Types } from 'mongoose';
import { AppError } from '@app/classes/AppError';
import { TBrand } from '../auth/auth.interface';
import { IOrder } from './Order.interface';
import { CartKey, PopulatedCart } from '../Cart/Cart.interface';
import {
  _decrementStockAndNotify,
  _processCartItems,
  _restockItems,
  generateDateBasedOrderNumber,
} from './Order.utils';
import { OrderRelatedEmails } from './Order.email';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { OrderSearchableFields, OrderStatus } from './Order.constant';
import { roundTwoDecimals } from '../Payment-Related/Transaction/Transaction.utils';
import crypto from 'crypto';

export const OrderServices = (connection: Connection, storePreference: TBrand) => {
  const OrderModel = getOrderModel(connection);
  const CartModel = getCartModel(connection);
  const ProductModel = getProductModel(connection);

  // --- UNIFIED CREATE ORDER FROM CART ---
  const createOrderIntoDB = async (key: CartKey, payload: Partial<IOrder>) => {
    // 1. Validate Input
    if (!key.user && !key.guestId) {
      throw new AppError('User or guest ID is required.', httpStatus.BAD_REQUEST);
    }

    // 2. Fetch Cart
    const cart = await CartModel.findOne(key).populate<PopulatedCart>({
      path: 'items.product',
      model: ProductModel,
    });

    if (!cart?.items?.length) {
      throw new AppError('Cart is empty.', httpStatus.NOT_FOUND);
    }

    // 3. Process Items (Validates Mixed Cart + Returns Type)
    const { initialOrderItems, subtotal, detectedOrderType } = await _processCartItems(cart, ProductModel);

    // 4. Admin Verification Check (Applies to BOTH Standard and Pre-Order)
    // If ANY item in the cart requires verification, the whole order is Pending.
    const requiresAdminApproval = cart.items.some((item) => item.product?.requiresAdminVerification);

    // 5. Coupon Logic
    // We trust the Cart's calculation because the Coupon Service already validated it when added.
    const discountAmount = cart.appliedCoupon?.discountAmount ?? 0;
    const couponCode = cart.appliedCoupon?.code;
    const finalTotal = subtotal - discountAmount;

    // 6. Prorate Discount (Distribute discount across items for accurate Net Price)
    const processedOrderItems = initialOrderItems.map((item) => {
      const itemOriginalValue = item.priceAtPurchase * item.quantity;
      // Avoid division by zero
      const discountRatio = subtotal > 0 ? itemOriginalValue / subtotal : 0;
      const itemProratedDiscount = roundTwoDecimals(discountAmount * discountRatio);
      const netPrice = roundTwoDecimals((itemOriginalValue - itemProratedDiscount) / item.quantity);

      return {
        ...item,
        proratedDiscount: roundTwoDecimals(itemProratedDiscount / item.quantity), // Per unit discount
        netPrice,
      };
    });

    // 7. Prepare Order Meta
    const prefix = detectedOrderType === 'pre-order' ? 'PRE' : 'ORD';
    const orderNumber = `${prefix}-${generateDateBasedOrderNumber()}`;
    // Expiry: 24 hours to pay
    const orderExpireAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

    // 8. Determine Status
    // Priority: If Admin Verification is needed -> 'pending'. Else -> 'awaiting-payment'.
    const initialStatus = requiresAdminApproval ? 'pending' : 'awaiting-payment';

    let order;
    const session: ClientSession = await connection.startSession();

    try {
      session.startTransaction();

      // --- INVENTORY LOGIC BRANCHING ---

      // BRANCH A: Pre-Order (Cross Border)
      if (detectedOrderType === 'pre-order') {
        for (const item of processedOrderItems) {
          // Optimized Atomic Update: Only increment if (Limit == 0) OR (Sold < Limit)
          const result = await ProductModel.updateOne(
            {
              'variants.sku': item.sku,
              $or: [
                { 'variants.inventory.preOrderLimit': 0 }, // Unlimited
                { $expr: { $lt: ['$variants.inventory.preOrdersSold', '$variants.inventory.preOrderLimit'] } },
              ],
            },
            { $inc: { 'variants.$.inventory.preOrdersSold': item.quantity } },
            { session },
          );

          // If no document was modified, it means the limit was reached during the transaction
          if (result.modifiedCount === 0) {
            throw new AppError(
              `Pre-order limit reached for ${item.sku}. The item was just snatched by another customer!`,
              httpStatus.BAD_REQUEST,
            );
          }
        }
      }
      // BRANCH B: Standard (Ready to Ship)
      else {
        // Handles physical stock decrement & low stock notifications
        await _decrementStockAndNotify(processedOrderItems, ProductModel, storePreference, session);
      }

      // 9. Construct Order Object

      // Get the rules from the products so the Payment Page knows what to do later
      const bookingPercentages = cart.items.map(
        (item) => (item.product as any)?.bookingConfiguration?.bookingFeePercentage ?? 10,
      );
      const maxBookingPct = bookingPercentages.length > 0 ? Math.max(...bookingPercentages) : 10;

      const forceFullPayment = cart.items.some(
        (item) => (item.product as any)?.bookingConfiguration?.allowPartialPayment === false,
      );

      const orderData: Partial<IOrder> = {
        ...payload,
        storePreference,
        orderNumber,
        items: processedOrderItems,
        subtotal,
        total: finalTotal,
        discountAmount,
        couponCode,
        orderType: detectedOrderType as 'standard' | 'pre-order',
        fulfillmentStatus: initialStatus,

        orderHistory: [
          {
            status: initialStatus,
            title: detectedOrderType === 'pre-order' ? 'Pre-Order Placed' : 'Order Placed',
            description: requiresAdminApproval
              ? 'Waiting for admin approval.'
              : 'Stock/Slot reserved. Waiting for payment.',
            timestamp: new Date(),
          },
        ],
        orderExpireAt,
        paymentInfo: {
          ...payload.paymentInfo,
          paidAmount: 0,
          dueAmount: finalTotal, // Full amount due initially
          bookingPercentageAtPurchase: maxBookingPct,
          paymentType: forceFullPayment ? 'full' : 'partial', // on the frontend just need to check this to disable partial payment options.
        } as any,
      };

      if (key.user) orderData.user = new Types.ObjectId(key.user);
      if (key.guestId) orderData.guestId = key.guestId;

      //  creating a cancel token so that user can access via the email without depending on devices
      const cancelToken = crypto.randomBytes(32).toString('hex');
      orderData.cancelToken = cancelToken;

      const orders = await OrderModel.create([orderData], { session });
      order = orders[0];

      // 10. Clear Cart
      await CartModel.deleteOne(key, { session });

      await session.commitTransaction();

      // 11. Send Emails (Non-Blocking)
      // Logic: If 'pending', send Pending email.
      // If 'awaiting-payment', send specific email based on type.
      if (initialStatus === 'pending') {
        OrderRelatedEmails.sendPendingOrderNotifications(order, ProductModel);
      } else {
        if (detectedOrderType === 'pre-order') {
          OrderRelatedEmails.sendPreOrderConfirmationNotifications(order, ProductModel);
        } else {
          OrderRelatedEmails.sendProcessingOrderNotifications(order, ProductModel);
        }
      }
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return order;
  };

  const confirmOrderByAdmin = async (payload: {
    orderNumber: string;
    tax: number;
    shippingFee: number;
    customDiscountAmount: number;
    overrideNoteHtml: string;
  }) => {
    const { orderNumber, tax, shippingFee, customDiscountAmount, overrideNoteHtml } = payload;

    const order = await OrderModel.findOne({ orderNumber, storePreference });
    if (!order) {
      throw new AppError(`Order ${orderNumber} not found.`, httpStatus.NOT_FOUND);
    }

    const session: ClientSession = await connection.startSession();
    try {
      session.startTransaction();

      const newTotalDiscount = (order.discountAmount || 0) + (customDiscountAmount || 0);

      //  Prorate Discounts across items (Critical for partial returns later)
      order.items = order.items.map((item) => {
        const itemOriginalValue = item.priceAtPurchase * item.quantity;
        const discountRatio = order.subtotal > 0 ? itemOriginalValue / order.subtotal : 0;
        const itemProratedDiscount = newTotalDiscount * discountRatio;
        const netValue = itemOriginalValue - itemProratedDiscount;

        return {
          ...item,
          proratedDiscount: roundTwoDecimals(itemProratedDiscount / item.quantity),
          netPrice: roundTwoDecimals(netValue / item.quantity),
        };
      });

      order.tax = tax;
      order.shippingFee = shippingFee;
      order.customDiscountAmount = customDiscountAmount;

      // Calculate Total: Subtotal - Discounts + Tax + Shipping
      order.total = (order.subtotal || 0) - newTotalDiscount + tax + shippingFee;

      order.fulfillmentStatus = 'awaiting-payment';

      order.orderHistory.push({
        status: 'awaiting-payment',
        title: 'Order Confirmed by Admin',
        description: 'Order details reviewed and approved. Awaiting payment.',
        timestamp: new Date(),
      });

      // Set Expiry (24 hours to pay)
      order.orderExpireAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
      order.paymentInfo.dueAmount = order.total;

      //  Decrement Stock (Hybrid Logic)
      if (order.fulfillmentStatus === 'pending') {
        await _decrementStockAndNotify(order.items, ProductModel, storePreference, session);
      }
      await order.save({ session });
      await session.commitTransaction();

      // send email to the customer about the order Confirmation
      OrderRelatedEmails.sendAdminConfirmationEmail(order, ProductModel, overrideNoteHtml);

      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  };

  const getAllOrdersFromDB = async (query: Record<string, unknown>): Promise<{ meta: any; result: IOrder[] }> => {
    const builderQuery: Record<string, any> = { ...query, storePreference };

    const orderTypeMatchStage: { $match: Record<string, any> } = {
      $match: {},
    };

    if (query.orderType) {
      const types = String(query.orderType).split(',');
      if (types.length > 1) {
        orderTypeMatchStage.$match.orderType = { $in: types };
      } else {
        orderTypeMatchStage.$match.orderType = types[0];
      }

      delete builderQuery.orderType;
    }

    const ordersQuery = new QueryBuilder(OrderModel, builderQuery);

    // Only add the stage if we actually added a filter to it
    if (Object.keys(orderTypeMatchStage.$match).length > 0) {
      ordersQuery.addStage(orderTypeMatchStage);
    }

    const rawOrders = await ordersQuery.filter().search(OrderSearchableFields).sort().paginate().limitFields().exec();

    const meta = await ordersQuery.getQueryMeta();

    const populatedOrders = (await OrderModel.populate(rawOrders, {
      path: 'items.product',
      model: ProductModel,
      select: 'title variants defaultImage category brand',
      populate: {
        path: 'category brand',
        select: 'title name',
      },
    })) as any[];

    const result = populatedOrders.map((orderDoc) => {
      const cleanOrder = JSON.parse(JSON.stringify(orderDoc));

      if (cleanOrder.items) {
        cleanOrder.items = cleanOrder.items.map((item: any) => {
          if (!item.product) {
            return item;
          }

          // Find the single matching variant for this order item
          const matchingVariant = item.product.variants?.find((v: any) => v.sku === item.sku);

          item.product.variants = matchingVariant ? [matchingVariant] : [];

          return item;
        });
      }

      return cleanOrder;
    });

    return { meta, result: result as IOrder[] };
  };

  const getSingleOrderFromDB = async (orderNumber: string): Promise<IOrder> => {
    const order = await OrderModel.findOne({
      orderNumber,
      storePreference,
      isDeleted: { $in: [true, false] },
    })
      .populate({
        path: 'items.product',
        model: ProductModel,
        select: 'title variants defaultImage category brand',
        populate: { path: 'category brand', select: 'title name' },
      })
      .lean();

    if (!order) {
      throw new AppError('Order not found', httpStatus.NOT_FOUND);
    }

    //  Sort History
    if (order.orderHistory && Array.isArray(order.orderHistory)) {
      order.orderHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Filter Variants (Hybrid View)
    order.items = order.items.map((item) => {
      const originalProduct = item.product as any;

      // Handle deleted/null products gracefully
      if (!originalProduct) return item;

      // Clone product to avoid mutating shared references in cache
      const productCopy = { ...originalProduct };

      // Find the specific variant purchased
      const matchingVariant = originalProduct.variants?.find((v: any) => v.sku === item.sku);

      productCopy.variants = matchingVariant ? [matchingVariant] : [];
      item.product = productCopy;

      return item;
    });

    return order as unknown as IOrder;
  };

  const getMyOrdersFromDB_byCustomer = async (
    user: string,
    query: Record<string, unknown>,
  ): Promise<{ meta: any; result: IOrder[] }> => {
    const builderQuery = {
      ...query,
      storePreference,
      user: new Types.ObjectId(user),
    };

    const ordersQuery = new QueryBuilder(OrderModel, builderQuery);

    const rawOrders = await ordersQuery.filter().search(OrderSearchableFields).sort().paginate().limitFields().exec();

    const meta = await ordersQuery.getQueryMeta();

    const populated = (await OrderModel.populate(rawOrders, {
      path: 'items.product',
      model: ProductModel,
      select: 'title variants defaultImage',
    })) as any[];

    // Clean Variants
    const result = populated.map((orderDoc) => {
      const order = JSON.parse(JSON.stringify(orderDoc));

      if (order.items) {
        order.items = order.items.map((item: any) => {
          if (!item.product) return item;

          const matchingVariant = item.product.variants?.find((v: any) => v.sku === item.sku);

          item.product.variants = matchingVariant ? [matchingVariant] : [];
          return item;
        });
      }
      return order;
    });

    return { meta, result: result as IOrder[] };
  };

  const cancelOrderByCustomer = async (orderNumber: string, token: string, user: string) => {
    const order = await OrderModel.findOne({
      orderNumber,
      cancelToken: token,
      storePreference,
      user,
    });

    if (!order) {
      throw new AppError(
        'Invalid cancellation request. The link may be expired or tampered with.',
        httpStatus.UNAUTHORIZED,
      );
    }

    // 2. Check Cancellable State
    const cancellableStatuses = ['pending', 'awaiting-payment', 'confirmed'];
    if (!cancellableStatuses.includes(order.fulfillmentStatus)) {
      throw new AppError(
        `Order cannot be cancelled because it is already in the "${order.fulfillmentStatus}" stage.`,
        httpStatus.BAD_REQUEST,
      );
    }

    const session = await connection.startSession();
    try {
      session.startTransaction();

      //  Inventory Reversion
      if (order.fulfillmentStatus !== 'pending') {
        if (order.orderType === 'pre-order') {
          for (const item of order.items) {
            await ProductModel.updateOne(
              { 'variants.sku': item.sku },
              { $inc: { 'variants.$.inventory.preOrdersSold': -item.quantity } },
              { session },
            );
          }
        } else {
          await _restockItems(order.items, ProductModel, session);
        }
      }
      const isGuest = !order.user;

      // Update Status and History
      order.fulfillmentStatus = 'cancelled';
      order.orderHistory.push({
        status: 'cancelled',
        title: isGuest ? 'Cancelled via Email Link' : 'Cancelled via Customer Dashboard',
        description: 'Identity verified via secure order token.',
        timestamp: new Date(),
      });

      // Clear the token so it can't be used again
      order.cancelToken = undefined;

      await order.save({ session });
      await session.commitTransaction();

      // Notify the customer of success
      OrderRelatedEmails.sendOrderStatusUpdateEmail(
        order,
        ProductModel,
        connection,
        'Order Cancelled Successfully',
        'Your order has been cancelled and inventory has been released.',
      );

      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  };

  const updateOrderStatusByAdmin = async (
    orderNumber: string,
    newStatus: OrderStatus,
    adminId: string,
    notes?: string,
    notifyCustomer: boolean = false,
  ) => {
    const order = await OrderModel.findOne({ orderNumber, storePreference });
    if (!order) {
      throw new AppError(`Order ${orderNumber} not found.`, httpStatus.NOT_FOUND);
    }

    const previousStatus = order.fulfillmentStatus;

    // Block updates if already cancelled
    if (previousStatus === 'cancelled') {
      throw new AppError(`Order ${orderNumber} is cancelled and cannot be updated.`, httpStatus.BAD_REQUEST);
    }

    // Block 'delivered' if unpaid
    if (newStatus === 'delivered' && order.paymentInfo.dueAmount > 0) {
      throw new AppError(
        `Cannot mark as 'delivered' until full payment is received. Amount Due: ${order.paymentInfo.dueAmount}`,
        httpStatus.BAD_REQUEST,
      );
    }

    const session = await connection.startSession();
    try {
      session.startTransaction();

      // Handle Restocking (If Admin cancels a live order)
      if (newStatus === 'cancelled' && previousStatus !== 'pending') {
        if (order.orderType === 'pre-order') {
          for (const item of order.items) {
            await ProductModel.updateOne(
              { 'variants.sku': item.sku },
              { $inc: { 'variants.$.inventory.preOrdersSold': -item.quantity } },
              { session },
            );
          }
        } else {
          await _restockItems(order.items, ProductModel, session);
        }
      }

      // Handle Delivery Date
      if (newStatus === 'delivered') {
        order.deliveredAt = new Date();
      }

      order.fulfillmentStatus = newStatus;

      const statusTitleMap: Record<string, string> = {
        processing: 'Order Processing',
        shipped: 'Order Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled by Admin',
        'awaiting-payment': 'Payment Pending',
      };

      const title = statusTitleMap[newStatus] || 'Status Updated';

      order.orderHistory.push({
        status: newStatus,
        title: title,
        description: notes || `Order status updated to ${newStatus}`,
        timestamp: new Date(),
        performedBy: new Types.ObjectId(adminId),
      });

      await order.save({ session });
      await session.commitTransaction();

      if (notifyCustomer) {
        OrderRelatedEmails.sendOrderStatusUpdateEmail(
          order,
          ProductModel,
          connection,
          title,
          notes ||
            `Your order status has been updated to ${newStatus}. You can track the details from the provided link.`,
        );
      }

      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  };

  const deleteOrderByAdmin = async (orderNumber: string) => {
    const orderInfo = await OrderModel.findOne({ orderNumber, storePreference });

    if (!orderInfo) {
      throw new AppError(`Order ${orderNumber} not found.`, httpStatus.NOT_FOUND);
    }

    if (orderInfo.isDeleted) {
      throw new AppError(`Order ${orderNumber} is already deleted.`, httpStatus.BAD_REQUEST);
    }

    orderInfo.isDeleted = true;
    const deletedOrderInfo = await orderInfo.save();

    return deletedOrderInfo;
  };

  const getArchivedOrdersFromDB = async (query: Record<string, unknown>) => {
    const archivedQuery = { ...query, storePreference, isDeleted: true };

    const ordersQuery = new QueryBuilder(OrderModel, archivedQuery);

    const rawOrders = await ordersQuery.filter().search(OrderSearchableFields).sort().paginate().limitFields().exec();

    const meta = await ordersQuery.getQueryMeta();

    const populatedOrders = (await OrderModel.populate(rawOrders, {
      path: 'items.product',
      model: ProductModel,
      select: 'title variants defaultImage category brand',
    })) as any[];

    // Clean Variants (Hybrid View Logic)
    const result = populatedOrders.map((orderDoc) => {
      const cleanOrder = JSON.parse(JSON.stringify(orderDoc));

      if (cleanOrder.items) {
        cleanOrder.items = cleanOrder.items.map((item: any) => {
          if (!item.product) return item;

          // Find the specific variant purchased
          const matchingVariant = item.product.variants?.find((v: any) => v.sku === item.sku);

          // Replace variant list with the single matching one
          item.product.variants = matchingVariant ? [matchingVariant] : [];
          return item;
        });
      }
      return cleanOrder;
    });

    return { meta, result: result as IOrder[] };
  };

  const deleteArchivedOrdersPermanentlyFromDB = async (ids: string[]) => {
    const result = await OrderModel.deleteMany({
      _id: { $in: ids },
      isDeleted: true,
      storePreference,
    });

    return result;
  };

  const reOrderByCustomer = async (orderNumber: string) => {
    const order = await OrderModel.findOne({
      orderNumber: orderNumber,
      fulfillmentStatus: 'abandoned',
      storePreference,
    });

    if (!order) {
      throw new AppError(`Abandoned order ${orderNumber} not found or already re-ordered.`, httpStatus.NOT_FOUND);
    }

    const session = await connection.startSession();
    try {
      session.startTransaction();

      if (order.orderType === 'pre-order') {
        // --- PRE-ORDER LOGIC ---
        // We must re-verify limits because slots might have filled up while abandoned
        for (const item of order.items) {
          const productDoc = await ProductModel.findOne({ 'variants.sku': item.sku }, { 'variants.$': 1 }).session(
            session,
          );

          const variant = productDoc?.variants[0];
          if (!variant) throw new AppError(`Product ${item.sku} no longer exists.`, httpStatus.BAD_REQUEST);

          const limit = variant.inventory?.preOrderLimit || 0;
          const sold = variant.inventory?.preOrdersSold || 0;

          // Check availability
          if (limit > 0) {
            const availableSlots = limit - sold;
            if (availableSlots < item.quantity) {
              throw new AppError(
                `Cannot re-order. Not enough pre-order slots left for ${item.sku}.`,
                httpStatus.BAD_REQUEST,
              );
            }
          }

          // Consume the slot (Increment sold count)
          await ProductModel.updateOne(
            { 'variants.sku': item.sku },
            { $inc: { 'variants.$.inventory.preOrdersSold': item.quantity } },
            { session },
          );
        }
      } else {
        // _decrementStockAndNotify handles the availability check internally
        await _decrementStockAndNotify(order.items, ProductModel, storePreference, session);
      }

      order.fulfillmentStatus = 'awaiting-payment';

      order.orderHistory.push({
        status: 'awaiting-payment',
        title: 'Order Re-confirmed',
        description: 'Customer reactivated abandoned order.',
        timestamp: new Date(),
      });

      order.orderExpireAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // +24 Hours
      order.reminderSent = false;

      await order.save({ session });
      await session.commitTransaction();

      OrderRelatedEmails.sendReorderConfirmationEmail(order, ProductModel);

      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  };

  const expireConfirmedOrders = async (): Promise<void> => {
    const now = new Date();

    // -------------------------------------------------------
    // 1. 12-HOUR REMINDER (Halfway Point)
    // Logic: 12 hours after creation, check if still awaiting payment.
    // -------------------------------------------------------

    const hours12 = 12 * 60 * 60 * 1000;
    const remind12Start = new Date(now.getTime() - hours12 - 15 * 60 * 1000);
    const remind12End = new Date(now.getTime() - hours12 + 15 * 60 * 1000);

    const orders12h = await OrderModel.find({
      fulfillmentStatus: 'awaiting-payment',
      reminderSent: { $ne: true }, // Not sent yet
      createdAt: { $gte: remind12Start, $lte: remind12End },
    }).limit(50);

    for (const order of orders12h) {
      try {
        // Use the unified function we established
        await OrderRelatedEmails.sendPaymentReminder(order, ProductModel);
        await OrderModel.updateOne({ _id: order._id }, { $set: { reminderSent: true } });
        console.log(`[Scheduler] 12h Reminder sent for: ${order.orderNumber}`);
      } catch (err) {
        console.error(`Failed to send 12h reminder for ${order.orderNumber}:`, err);
      }
    }

    // -------------------------------------------------------
    // 2. 2-HOUR FINAL URGENCY REMINDER
    // Logic: 2 hours BEFORE orderExpireAt.
    // -------------------------------------------------------
    const hours2 = 2 * 60 * 60 * 1000;
    const remind2Start = new Date(now.getTime() + hours2 - 15 * 60 * 1000);
    const remind2End = new Date(now.getTime() + hours2 + 15 * 60 * 1000);

    const finalUrgencyOrders = await OrderModel.find({
      fulfillmentStatus: 'awaiting-payment',
      finalReminderSent: { $ne: true },
      orderExpireAt: { $gte: remind2Start, $lte: remind2End },
    });

    for (const order of finalUrgencyOrders) {
      try {
        await OrderRelatedEmails.sendPaymentReminder(order, ProductModel);
        await OrderModel.updateOne({ _id: order._id }, { $set: { finalReminderSent: true } });
        console.log(`[Scheduler] 2h Final Urgency sent for: ${order.orderNumber}`);
      } catch (err) {
        console.error(`Failed to send 2h reminder for ${order.orderNumber}:`, err);
      }
    }

    // -------------------------------------------------------
    // 3. EXPIRE OVERDUE ORDERS
    // Logic: If now > orderExpireAt, return stock and mark abandoned.
    // -------------------------------------------------------
    const expiredOrders = await OrderModel.find({
      fulfillmentStatus: 'awaiting-payment',
      orderExpireAt: { $lte: now },
    }).limit(50);

    for (const order of expiredOrders) {
      const session = await connection.startSession();
      try {
        session.startTransaction();

        // A. Return Stock / Slots
        if (order.orderType === 'pre-order') {
          for (const item of order.items) {
            await ProductModel.updateOne(
              { 'variants.sku': item.sku },
              { $inc: { 'variants.$.inventory.preOrdersSold': -item.quantity } },
              { session },
            );
          }
        } else {
          await _restockItems(order.items, ProductModel, session);
        }

        // B. Update Status and History
        order.fulfillmentStatus = 'abandoned';
        order.orderHistory.push({
          status: 'abandoned',
          title: 'Order Expired',
          description: 'Payment window closed. Order marked as abandoned.',
          timestamp: new Date(),
        });

        await order.save({ session });
        await session.commitTransaction();

        // C. Notify User
        await OrderRelatedEmails.sendOrderExpiredEmail(order, ProductModel);

        console.log(`[Scheduler] Order ${order.orderNumber} expired and items restocked.`);
      } catch (err) {
        await session.abortTransaction();
        console.error(`Failed to expire order ${order.orderNumber}:`, err);
      } finally {
        session.endSession();
      }
    }
  };

  // Abandoned related functions
  const sendAbandonedOrderReminders = async (orderNumbers: string[]) => {
    const abandonedOrders = await OrderModel.find({
      orderNumber: { $in: orderNumbers },
      fulfillmentStatus: 'abandoned',
      storePreference,
      email: { $exists: true, $ne: '' },
    });

    let sentCount = 0;

    for (const order of abandonedOrders) {
      try {
        await OrderRelatedEmails.sendAbandonedReminderEmail(order, ProductModel);

        // Update history so admin can see when the last reminder was sent
        order.orderHistory.push({
          status: 'abandoned',
          title: 'Manual Recovery Sent',
          description: `Admin manually sent a recovery reminder.`,
          timestamp: new Date(),
        });

        // We still set this to true so the AUTO system doesn't double-send later
        order.abandonedReminderSent = true;

        await order.save();
        sentCount++;
      } catch (err) {
        console.error(`Failed to send abandoned reminder for order ${order.orderNumber}:`, err);
      }
    }

    return {
      totalFound: abandonedOrders.length,
      sentCount,
      failedCount: abandonedOrders.length - sentCount,
    };
  };

  // Inside your daily/midnight cron job
  const processAutomatedAbandonedRecovery = async (): Promise<void> => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const ordersToRecover = await OrderModel.find({
      fulfillmentStatus: 'abandoned',
      abandonedReminderSent: { $ne: true }, // Only send the AUTOMATIC one once
      updatedAt: { $lte: twentyFourHoursAgo },
      storePreference,
    });

    for (const order of ordersToRecover) {
      try {
        await OrderRelatedEmails.sendAbandonedReminderEmail(order, ProductModel);
        // Mark it so we don't send the automated one again
        await OrderModel.updateOne({ _id: order._id }, { $set: { abandonedReminderSent: true } });
        console.log(`[Auto-Recovery] Sent for order ${order.orderNumber}`);
      } catch (err) {
        console.error(`Auto-recovery failed for ${order.orderNumber}:`, err);
      }
    }
  };
  // Abandoned related done

  const sendPaymentReminderToPartialPaidCustomer = async (orderNumber: string) => {
    const order = await OrderModel.findOne({ orderNumber, storePreference });

    if (!order) {
      throw new AppError(`Order ${orderNumber} not found.`, httpStatus.NOT_FOUND);
    }

    // Safety Check: Don't send a reminder if they owe nothing
    if (order.paymentInfo.dueAmount <= 0) {
      throw new AppError('This order is already fully paid.', httpStatus.BAD_REQUEST);
    }

    // Use the unified function
    await OrderRelatedEmails.sendPaymentReminder(order, ProductModel);

    return { message: `Payment reminder sent successfully to ${order.email}.` };
  };

  return {
    reOrderByCustomer,
    createOrderIntoDB,
    getAllOrdersFromDB,
    deleteOrderByAdmin,
    confirmOrderByAdmin,
    getSingleOrderFromDB,
    cancelOrderByCustomer,
    expireConfirmedOrders,
    getArchivedOrdersFromDB,
    updateOrderStatusByAdmin,
    getMyOrdersFromDB_byCustomer,
    sendPaymentReminderToPartialPaidCustomer,
    deleteArchivedOrdersPermanentlyFromDB,
    sendAbandonedOrderReminders,
    processAutomatedAbandonedRecovery,
  };
};
