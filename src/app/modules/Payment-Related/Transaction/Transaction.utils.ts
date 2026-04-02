import { ClientSession, Types } from 'mongoose';
import { IOrder } from '@app/modules/Order/Order.interface';
import { OrderModel } from '@app/modules/Order/Order.model';
import { TransactionModel } from './Transaction.model';
import { ProductModel } from '@app/modules/products/product.model';
import { ORDER_STATUS, PAYMENT_STATUS } from '@app/modules/Order/Order.constant';
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

  // Fee calculated on the Grand Total of the Order (Default 0 for local POS unless configured)
  const feePercentage = /* Number(config.refund_processing_fee_percentage) || */ 0;
  const feeCharged = roundTwoDecimals((order.totalAmount * feePercentage) / 100);

  // What the customer actually gets back
  let amountToReturn = roundTwoDecimals(paidAmount - feeCharged);

  // If the fee is higher than what was paid, return 0 (don't charge the customer more)
  if (amountToReturn < 0) amountToReturn = 0;

  return {
    isRefundable: true,
    paidAmount,
    orderTotal: order.totalAmount,
    feePercentage,
    feeCharged,
    amountToReturn,
  };
};

export const _updateOrderPaymentSummary = async (orderId: Types.ObjectId, session: ClientSession): Promise<IOrder> => {
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

  // Safe calculation to prevent negative due amounts
  const dueAmount = roundTwoDecimals(Math.max(0, order.totalAmount - totalPaid));

  order.paymentInfo.paidAmount = totalPaid;
  order.paymentInfo.dueAmount = dueAmount;

  // --- BRANCH A: VOID / CANCELLATION PATH ---
  // If totalPaid is 0 but sales existed, it means the order is fully refunded/cancelled.
  if (salesTotal > 0 && totalPaid <= 0) {
    if (order.status !== ORDER_STATUS.CANCELLED) {
      order.status = ORDER_STATUS.CANCELLED;
      order.paymentInfo.paymentStatus = PAYMENT_STATUS.REFUNDED;

      order.orderHistory.push({
        status: ORDER_STATUS.CANCELLED,
        title: 'Order Cancelled & Refunded',
        description: `Ledger balanced to zero. Items restocked.`,
        timestamp: new Date(),
      });

      // Handle Inventory Reversion using our unified utility
      await _restockItems(order.items, ProductModel, session);
    }
  }
  // --- BRANCH B: ACTIVE / SALE PATH ---
  else {
    // Set Payment Label using our precise Enums
    if (dueAmount <= 0) {
      order.paymentInfo.paymentStatus = PAYMENT_STATUS.PAID;
    } else if (totalPaid > 0) {
      order.paymentInfo.paymentStatus = PAYMENT_STATUS.PARTIAL;
    } else {
      order.paymentInfo.paymentStatus = PAYMENT_STATUS.UNPAID;
    }

    /**
     * AUTO-UPDATE STATUS:
     * Move from 'Pending' to 'Confirmed' automatically upon receiving a payment.
     */
    if (totalPaid > 0 && order.status === ORDER_STATUS.PENDING) {
      order.status = ORDER_STATUS.CONFIRMED;

      order.orderHistory.push({
        status: ORDER_STATUS.CONFIRMED,
        title: 'Order Confirmed',
        description: `Payment recorded. Current balance: ৳${order.paymentInfo.dueAmount}`,
        timestamp: new Date(),
      });
    }
  }

  await order.save({ session });
  return order;
};
