import { TBrand } from '@app/modules/auth/auth.interface';
import { IOrder } from '@app/modules/Order/Order.interface';
import { getOrderModel } from '@app/modules/Order/Order.model';
import { config } from '@config/env';
import { Connection, ClientSession, Types } from 'mongoose';
import { getTransactionModel } from './Transaction.model';
import { getProductModel } from '@app/modules/products/product.model';
import { PRODUCT_FULFILLMENT_TYPE } from '@app/modules/products/product.constants';
import { _restockItems } from '@app/modules/Order/Order.utils';

export const roundTwoDecimals = (value: number): number => {
  return Number(Math.round(Number(value + 'e2')) + 'e-2');
};

export const _calculateRefundDetails = (order: IOrder) => {
  const paidAmount = order.paymentInfo.paidAmount;

  if (paidAmount <= 0) {
    return {
      isRefundable: false,
      reason: 'This order has no paid amount to refund.',
      paidAmount: 0,
      feeCharged: 0,
      amountToReturn: 0,
    };
  }

  // Fee calculated on the Grand Total of the Order
  const feePercentage = Number(config.refund_processing_fee_percentage) || 5;
  const feeCharged = roundTwoDecimals((order.total * feePercentage) / 100); //charged based on order total
  // const feeCharged = roundTwoDecimals((paidAmount * feePercentage) / 100); // based on paid amount

  // What the customer actually gets back
  let amountToReturn = roundTwoDecimals(paidAmount - feeCharged);

  // If the fee is higher than what was paid, return 0 (don't charge the customer more)
  if (amountToReturn < 0) amountToReturn = 0;

  return {
    isRefundable: true,
    paidAmount,
    orderTotal: order.total,
    feePercentage,
    feeCharged,
    amountToReturn,
  };
};

export const _updateOrderPaymentSummary = async (
  orderId: Types.ObjectId,
  connection: Connection,
  storePreference: TBrand,
  session: ClientSession,
): Promise<IOrder> => {
  const OrderModel = getOrderModel(connection);
  const TransactionModel = getTransactionModel(connection);
  const ProductModel = getProductModel(connection);

  const order = await OrderModel.findById(orderId).session(session);
  if (!order) throw new Error('Order not found during sync.');

  // 1. Aggregate Sales vs Refunds
  const totals = await TransactionModel.aggregate([
    { $match: { order: order._id } },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
      },
    },
  ]).session(session);

  const salesTotal = totals.find((t) => t._id === 'sale')?.totalAmount || 0;
  const refundsTotal = totals.find((t) => t._id === 'refund')?.totalAmount || 0;

  const totalPaid = roundTwoDecimals(salesTotal - refundsTotal);
  const dueAmount = roundTwoDecimals(order.total - totalPaid);

  order.paymentInfo.paidAmount = totalPaid;
  order.paymentInfo.dueAmount = dueAmount;

  // --- BRANCH A: VOID / CANCELLATION PATH ---
  // If totalPaid is 0 but sales existed, it means the order is fully settled/cancelled.
  if (salesTotal > 0 && totalPaid <= 0) {
    if (order.fulfillmentStatus !== 'cancelled') {
      order.fulfillmentStatus = 'cancelled';
      order.paymentInfo.paymentType = 'refunded';

      order.orderHistory.push({
        status: 'cancelled',
        title: 'Order Cancelled & Refunded',
        description: `Ledger balanced to zero for ${storePreference}. Items restocked.`,
        timestamp: new Date(),
      });

      // Handle Inventory Reversion
      for (const item of order.items) {
        if (item.fulfillmentType === PRODUCT_FULFILLMENT_TYPE.CROSS_BORDER) {
          // Pre-order: Decrease virtual slot count
          await ProductModel.updateOne(
            { 'variants.sku': item.sku },
            { $inc: { 'variants.$.inventory.preOrdersSold': -item.quantity } },
            { session },
          );
        } else {
          // Standard: Increase physical stock
          await _restockItems([item], ProductModel, session);
        }
      }
    }
  }
  // --- BRANCH B: ACTIVE / SALE PATH ---
  else {
    // Set Payment Label
    if (dueAmount <= 0) {
      order.paymentInfo.paymentType = 'full';
    } else if (totalPaid > 0) {
      const saleCount = await TransactionModel.countDocuments({
        order: order._id,
        type: 'sale',
      }).session(session);
      // 'partial' for the 10-50% booking fee, 'remaining' for any payment after that.
      order.paymentInfo.paymentType = saleCount > 1 ? 'remaining' : 'partial';
    }

    /**
     * AUTO-UPDATE STATUS: Handle Confirmation & History Messaging
     * Confirmation to Standard, Pre-Order, and Group-Buy to 'confirmed' upon payment.
     */
    if (totalPaid > 0) {
      let historyTitle = 'Order Confirmed';
      let historyDesc = `Successfully processed payment via ${storePreference}. Current balance: ৳${order.paymentInfo.dueAmount}`;

      if (order.orderType === 'pre-order') {
        historyTitle = 'Pre-Order Payment Verified | Order Confirmed';
      }

      if (order.orderType === 'group-buy') {
        historyTitle = 'Group Buy Confirmed | Spot Locked';
        historyDesc = `Payment verified! You are officially in the deal. Remember, your final price will reduce as more members join. Current balance to settle later: ৳${order.paymentInfo.dueAmount}`;
      }

      // TRIGGER: Move from 'awaiting-payment' or 'group-buy-pending' to 'confirmed'
      const needsConfirmation =
        order.fulfillmentStatus === 'awaiting-payment' || order.fulfillmentStatus === 'group-buy-pending';

      if (needsConfirmation) {
        order.fulfillmentStatus = 'confirmed';

        order.orderHistory.push({
          status: 'confirmed',
          title: historyTitle,
          description: historyDesc,
          timestamp: new Date(),
        });
      }
    }
  }

  await order.save({ session });
  return order;
};
