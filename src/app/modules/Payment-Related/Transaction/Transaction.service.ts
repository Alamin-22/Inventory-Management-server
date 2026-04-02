/* eslint-disable @typescript-eslint/no-explicit-any */
import { startSession, Types } from 'mongoose';
import httpStatus from 'http-status';
import { AppError } from '@app/classes/AppError';
import { TransactionModel } from './Transaction.model';
import { OrderModel } from '../../Order/Order.model';
import { ITransaction, TPaymentCategory, TTransactionMethod } from './Transaction.interface';
import { _calculateRefundDetails, _updateOrderPaymentSummary } from './Transaction.utils';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { TransactionSearchableFields } from './Transaction.constant';
import { TransactionEmailService } from './Transaction.email';
import { User } from '@app/modules/user/user.model';
import puppeteer from 'puppeteer/lib/types';

/**
 * RECORD MANUAL PAYMENT (POS/Admin)
 * Creates a ledger entry and synchronizes the parent order's financial summary.
 */
const addManualTransaction = async (
  orderId: string,
  payload: {
    amount: number;
    method: Extract<TTransactionMethod, 'cash' | 'mobile_banking' | 'bank_transfer' | 'cod'>;
    provider?: string;
    gatewayTransactionId?: string;
    notes?: string;
  },
  adminId: string,
) => {
  const order = await OrderModel.findOne({ orderId, isDeleted: false });
  if (!order) throw new AppError('Order not found.', httpStatus.NOT_FOUND);

  const session = await startSession();

  try {
    session.startTransaction();

    const remainingBeforeThisPayment = order.paymentInfo.dueAmount;
    let paymentCategory: TPaymentCategory = 'partial';

    // 1. Calculate Payment Category based on IMS logic
    // We use a 1.0 BDT tolerance for floating point rounding
    if (payload.amount >= remainingBeforeThisPayment - 1.0) {
      paymentCategory = 'full';
    }

    // 2. Insert ledger entry
    const [newTransaction] = await TransactionModel.create(
      [
        {
          order: order._id,
          amount: payload.amount,
          method: payload.method,
          paymentCategory,
          gatewayInfo: {
            gateway: 'manual',
            paidBy: payload.provider || '',
            bankTransactionId: payload.gatewayTransactionId || '',
            storeTransactionId: 'N/A',
          },
          notes: payload.notes?.trim(),
          recordedBy: new Types.ObjectId(adminId),
          type: 'sale',
        },
      ],
      { session },
    );

    // 3. Sync order payment summary (updates paidAmount, dueAmount, and status)
    const updatedOrder = await _updateOrderPaymentSummary(order._id as Types.ObjectId, session);

    await session.commitTransaction();

    TransactionEmailService.sendPaymentInvoice(newTransaction, updatedOrder).catch((err) =>
      console.error('Receipt Email Failed:', err),
    );

    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * CREATE MANUAL REFUND
 * Handles the accounting for returns:
 * A) Sale Refund (Money back to customer)
 * B) System Adjustment (Optionally tracking restock fees)
 */
const createManualRefund = async (
  orderId: string,
  payload: {
    refundMethod: Extract<TTransactionMethod, 'cash' | 'bank_transfer' | 'mobile_banking' | 'manual_refund'>;
    provider?: string;
    transactionId?: string;
    notes?: string;
  },
  adminId: string,
) => {
  const targetOrder = await OrderModel.findOne({ orderId, isDeleted: false });
  if (!targetOrder) throw new AppError('Order not found.', httpStatus.NOT_FOUND);

  const refundDetails = _calculateRefundDetails(targetOrder as any);
  if (!refundDetails.isRefundable) {
    throw new AppError(refundDetails.reason as string, httpStatus.BAD_REQUEST);
  }

  const session = await startSession();

  try {
    session.startTransaction();
    const adminObjectId = new Types.ObjectId(adminId);

    // A) Customer refund entry
    const refundEntries: Array<Partial<ITransaction>> = [
      {
        order: targetOrder._id as Types.ObjectId,
        amount: refundDetails.amountToReturn,
        notes: `Returned to customer. ${payload.notes || ''}`.trim(),
        recordedBy: adminObjectId,
        type: 'refund',
        method: payload.refundMethod,
        paymentCategory: 'refunded',
        gatewayInfo: {
          gateway: 'manual',
          paidBy: payload.provider || '',
          bankTransactionId: payload.transactionId || '',
          storeTransactionId: 'N/A',
        },
      },
    ];

    // B) System fee entry (if a restock/processing fee is applied)
    if (refundDetails.feeCharged > 0) {
      refundEntries.push({
        order: targetOrder._id as Types.ObjectId,
        amount: refundDetails.feeCharged,
        notes: `Internal adjustment: Refund processing fee retained.`,
        recordedBy: adminObjectId,
        type: 'fee',
        method: 'system_adjustment',
        paymentCategory: 'refund_fee',
        gatewayInfo: {
          gateway: 'manual',
          paidBy: 'N/A',
          bankTransactionId: 'N/A',
          storeTransactionId: 'N/A',
        },
      });
    }

    await TransactionModel.insertMany(refundEntries, { session, ordered: true });

    // Sync order state (Automatically handles status flip and restocking via utils)
    const updatedOrder = await _updateOrderPaymentSummary(targetOrder._id as Types.ObjectId, session);

    await session.commitTransaction();
    return updatedOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getRefundPreview = async (orderId: string) => {
  const order = await OrderModel.findOne({ orderId, isDeleted: false });
  if (!order) throw new AppError('Order not found.', httpStatus.NOT_FOUND);
  return _calculateRefundDetails(order as any);
};

const getAllTransactionsFromDB = async (query: Record<string, any>) => {
  const transactionQuery = new QueryBuilder(TransactionModel, query)
    .populate({
      from: 'orders',
      localField: 'order',
      foreignField: '_id',
      as: 'orderInfo',
      unwind: true,
    })
    .search(TransactionSearchableFields)
    .populate({
      from: 'users',
      localField: 'recordedBy',
      foreignField: '_id',
      as: 'recordedByUserInfo',
      unwind: true,
    })
    .addStage({
      $project: {
        _id: 1,
        amount: 1,
        type: 1,
        method: 1,
        createdAt: 1,
        notes: 1,
        orderId: '$orderInfo.orderId',
        paymentCategory: { $ifNull: ['$paymentCategory', 'full'] },
        gatewayInfo: {
          bankTransactionId: { $ifNull: ['$gatewayInfo.bankTransactionId', 'N/A'] },
          paidBy: { $ifNull: ['$gatewayInfo.paidBy', 'Cash/POS'] },
        },
        recordedBy: {
          $ifNull: ['$recordedByUserInfo.email', 'System'],
        },
      },
    })
    .sort()
    .paginate();

  const result = await transactionQuery.exec();
  const meta = await transactionQuery.getQueryMeta();

  return { meta, result };
};

const getSingleTransaction = async (transactionId: string) => {
  const isObjectId = Types.ObjectId.isValid(transactionId);

  const findQuery: any = {
    $or: [
      ...(isObjectId ? [{ _id: new Types.ObjectId(transactionId) }] : []),
      { 'gatewayInfo.bankTransactionId': transactionId },
    ],
  };

  const transaction = await TransactionModel.findOne(findQuery).populate({
    path: 'order',
    select: 'orderId paymentInfo totalAmount status createdAt',
  });

  if (!transaction) throw new AppError('Transaction not found', httpStatus.NOT_FOUND);

  return transaction;
};

/**
 * DOWNLOAD INVOICE PDF
 * Generates a professional PDF receipt using Puppeteer
 */
const downloadInvoicePdf = async (transactionId: string): Promise<Buffer> => {
  const transaction = await getSingleTransaction(transactionId);
  const order = transaction.order as any;

  const invoiceData = await TransactionEmailService.prepareInvoiceData(transaction, order);
  const htmlContent = TransactionEmailService.getInvoiceHtml(invoiceData);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    return Buffer.from(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation Failed:', err);
    throw new AppError('Failed to generate PDF document', httpStatus.INTERNAL_SERVER_ERROR);
  } finally {
    if (browser) await browser.close();
  }
};

/**
 * ORDER FINANCIAL AUDIT
 * Provides the full POS ledger for a specific order (Sale entries, Refunds, Fees)
 */
const getOrderFinancialAudit = async (orderId: string) => {
  const order = await OrderModel.findOne({ orderId, isDeleted: false }).lean();
  if (!order) throw new AppError('Order not found.', httpStatus.NOT_FOUND);

  const transactions = await TransactionModel.find({ order: order._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'recordedBy',
      model: User,
      select: 'email role',
    })
    .lean();

  return {
    orderSummary: {
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      paidAmount: order.paymentInfo.paidAmount,
      dueAmount: order.paymentInfo.dueAmount,
      status: order.status,
      paymentStatus: order.paymentInfo.paymentStatus,
    },
    transactions: transactions.map((t) => ({
      ...t,
      recordedBy: (t.recordedBy as any)?.email || 'System',
    })),
  };
};

export const TransactionServices = {
  addManualTransaction,
  createManualRefund,
  getRefundPreview,
  getAllTransactionsFromDB,
  getSingleTransaction,
  downloadInvoicePdf,
  getOrderFinancialAudit,
};
