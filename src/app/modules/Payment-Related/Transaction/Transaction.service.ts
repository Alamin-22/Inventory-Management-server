/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection, Types } from 'mongoose';
import httpStatus from 'http-status';
import { AppError } from '@app/classes/AppError';
import { TBrand } from '../../auth/auth.interface';
import { getTransactionModel } from './Transaction.model';
import { getOrderModel } from '../../Order/Order.model';
import { ITransaction, TPaymentCategory, TTransactionMethod } from './Transaction.interface';
import { _calculateRefundDetails, _updateOrderPaymentSummary } from './Transaction.utils';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { TransactionSearchableFields } from './Transaction.constant';
import { TransactionEmailService } from './Transaction.email';
import puppeteer from 'puppeteer';
import { getUserModel } from '@app/modules/user/user.model';
import { USER_ROLE } from '@app/modules/user/user.constants';

export const TransactionServices = (connection: Connection, storePreference: TBrand) => {
  const TransactionModel = getTransactionModel(connection);
  const OrderModel = getOrderModel(connection);
  const UserModel = getUserModel(connection);

  const addManualTransaction = async (
    orderNumber: string,
    payload: {
      amount: number;
      method: Extract<TTransactionMethod, 'cod' | 'bank_transfer' | 'mobile_banking' | 'cash'>;
      provider?: string;
      gatewayTransactionId?: string;
      notes?: string;
    },
    adminId: string,
  ) => {
    const order = await OrderModel.findOne({ orderNumber, storePreference });
    if (!order) throw new AppError('Order not found.', httpStatus.NOT_FOUND);

    const session = await connection.startSession();

    try {
      session.startTransaction();

      let paymentCategory: TPaymentCategory = 'partial';

      const remainingBeforeThisPayment = (order.total || 0) - (order.paymentInfo?.paidAmount || 0);

      const isFull = payload.amount >= remainingBeforeThisPayment - 1.0;

      if (isFull) {
        paymentCategory = 'full';
      } else if (order.orderType === 'pre-order' || order.orderType === 'group-buy') {
        const bookingPct = order.paymentInfo?.bookingPercentageAtPurchase || 0;
        const bookingAmount = ((order.total || 0) * bookingPct) / 100;

        // Within 50 BDT tolerance
        if (Math.abs(payload.amount - bookingAmount) < 50) {
          paymentCategory = 'booking_money';
        }
      }

      // Insert single doc inside transaction
      await new TransactionModel({
        order: order._id,
        amount: payload.amount,
        method: payload.method,
        storePreference,

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
      }).save({ session });

      await _updateOrderPaymentSummary(order._id as Types.ObjectId, connection, storePreference, session);

      await session.commitTransaction();

      return await OrderModel.findById(order._id);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  };

  /**
   * CREATE MANUAL REFUND
   * Creates two ledger entries:
   * A) Customer refund (money leaving the business).
   * B) Refund processing fee (money retained by the store).
   */
  const createManualRefund = async (
    orderNumber: string,
    payload: {
      refundMethod: Extract<TTransactionMethod, 'bank_transfer' | 'mobile_banking' | 'manual_refund'>;
      provider?: string;
      transactionId?: string;
      notes?: string;
    },
    adminId: string,
  ) => {
    const targetOrder = await OrderModel.findOne({ orderNumber, storePreference });
    if (!targetOrder) throw new AppError('Order not found.', httpStatus.NOT_FOUND);

    const refundDetails = _calculateRefundDetails(targetOrder as any);
    if (!refundDetails.isRefundable) {
      throw new AppError(refundDetails.reason as string, httpStatus.BAD_REQUEST);
    }

    const session = await connection.startSession();

    try {
      session.startTransaction();

      const adminObjectId = new Types.ObjectId(adminId);

      // A) Customer refund entry
      const refundEntries: Array<Partial<ITransaction>> = [
        {
          order: targetOrder._id,
          amount: refundDetails.amountToReturn,
          notes: `Amount returned to customer. ${payload.notes || ''}`.trim(),
          recordedBy: adminObjectId,

          type: 'refund',
          method: payload.refundMethod,
          paymentCategory: 'refunded',

          storePreference,
          gatewayInfo: {
            gateway: 'manual',
            paidBy: payload.provider || '',
            bankTransactionId: payload.transactionId || '',
            storeTransactionId: 'N/A',
          },
        },
      ];

      // B) Refund processing fee retained by store (separate semantic)
      if (refundDetails.feeCharged > 0) {
        refundEntries.push({
          order: targetOrder._id,
          amount: refundDetails.feeCharged,
          notes: `Internal: Refund Processing Fee (${refundDetails.feePercentage}%)`,
          recordedBy: adminObjectId,

          type: 'fee',
          method: 'system_adjustment',
          paymentCategory: 'refund_fee',

          storePreference,
          gatewayInfo: {
            gateway: 'manual',
            paidBy: 'N/A',
            bankTransactionId: 'N/A',
            storeTransactionId: 'N/A',
          },
        });
      }

      // Insert ledger entries inside transaction
      await TransactionModel.insertMany(refundEntries, { session, ordered: true });

      // Sync order payment summary inside the same transaction
      await _updateOrderPaymentSummary(targetOrder._id as Types.ObjectId, connection, storePreference, session);

      await session.commitTransaction();

      return await OrderModel.findById(targetOrder._id);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  };

  const getRefundPreview = async (orderNumber: string) => {
    const order = await OrderModel.findOne({ orderNumber, storePreference });
    if (!order) throw new AppError('Order not found.', httpStatus.NOT_FOUND);
    return _calculateRefundDetails(order as any);
  };

  const getAllTransactionsFromDB = async (query: Record<string, any>) => {
    const transactionQuery = new QueryBuilder(TransactionModel, query);

    transactionQuery.match('storePreference', storePreference);

    // Join with Orders
    transactionQuery.populate({
      from: 'orders',
      localField: 'order',
      foreignField: '_id',
      as: 'orderInfo',
      unwind: true,
    });

    transactionQuery.search(TransactionSearchableFields);

    // Join with User/Admin
    transactionQuery.populate({
      from: 'users',
      localField: 'recordedBy',
      foreignField: '_id',
      as: 'recordedByUserInfo',
      unwind: true,
    });

    //  Final Projection (Organized Structure)
    transactionQuery.addStage({
      $project: {
        _id: 1,
        amount: 1,
        type: 1,
        method: 1,
        createdAt: 1,
        notes: 1,
        storePreference: 1,
        orderNumber: '$orderInfo.orderNumber',
        orderId: '$orderInfo._id',
        paymentCategory: { $ifNull: ['$paymentCategory', 'full'] },

        gatewayInfo: {
          bankTransactionId: { $ifNull: ['$gatewayInfo.bankTransactionId', 'N/A'] },
          storeTransactionId: { $ifNull: ['$gatewayInfo.storeTransactionId', 'N/A'] },
          paidBy: { $ifNull: ['$gatewayInfo.paidBy', 'N/A'] },
          gateway: { $ifNull: ['$gatewayInfo.gateway', 'manual'] },
        },

        recordedBy: {
          $ifNull: ['$recordedByUserInfo.name', '$recordedByUserInfo.email', 'System/Gateway'],
        },
      },
    });

    transactionQuery.filter(['brand']).sort().paginate();

    const result = await transactionQuery.exec();
    const meta = await transactionQuery.getQueryMeta();

    return { meta, result };
  };

  const getSingleTransaction = async (transactionId: string, viewerId: string, role: 'admin' | 'customer') => {
    const isObjectId = Types.ObjectId.isValid(transactionId);

    const findQuery: any = {
      storePreference,
      $or: [
        ...(isObjectId ? [{ _id: new Types.ObjectId(transactionId) }] : []),
        { 'gatewayInfo.storeTransactionId': transactionId },
        { 'gatewayInfo.bankTransactionId': transactionId },
      ],
    };

    const transaction = await TransactionModel.findOne(findQuery).populate({
      path: 'order',
      select: 'orderNumber paymentInfo total createdAt',
    });

    if (!transaction) throw new AppError('Transaction not found', httpStatus.NOT_FOUND);

    // SECURITY: If not an admin, check if the user actually owns the parent order
    if (role !== 'admin') {
      const orderUser = (transaction.order as any)?.user;
      if (orderUser && orderUser.toString() !== viewerId) {
        throw new AppError('Unauthorized access to this ledger entry', httpStatus.FORBIDDEN);
      }
    }

    return transaction;
  };

  const getAllTransactionsByCustomer = async (customerId: string) => {
    return await TransactionModel.aggregate([
      { $match: { storePreference } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderInfo',
        },
      },
      { $unwind: '$orderInfo' },
      { $match: { 'orderInfo.user': new Types.ObjectId(customerId) } },
      {
        $project: {
          _id: 1,
          amount: 1,
          type: 1,
          method: 1,
          createdAt: 1,
          paymentCategory: { $ifNull: ['$paymentCategory', 'full'] },
          orderNumber: '$orderInfo.orderNumber',
          gatewayInfo: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
  };

  /**
   * DOWNLOAD INVOICE PDF
   */

  const downloadInvoicePdf = async (
    transactionId: string,
    viewerId: string,
    role: 'admin' | 'customer' | 'super_admin',
  ): Promise<Buffer> => {
    const isObjectId = Types.ObjectId.isValid(transactionId);

    const transaction = await TransactionModel.findOne({
      storePreference,
      $or: [
        ...(isObjectId ? [{ _id: new Types.ObjectId(transactionId) }] : []),
        { 'gatewayInfo.storeTransactionId': transactionId },
        { 'gatewayInfo.bankTransactionId': transactionId },
      ],
    }).populate({
      path: 'order',
    });

    if (!transaction) throw new AppError('Transaction not found', httpStatus.NOT_FOUND);

    const order = transaction.order as any;

    // Role Check: Explicitly allow staff roles
    const isStaff = role === USER_ROLE.admin || role === USER_ROLE.super_admin;
    const isOwner = order.user?.toString() === viewerId || order.guestId === viewerId;
    if (!isStaff && !isOwner) {
      throw new AppError('Access denied. You do not have permission to download this invoice.', httpStatus.FORBIDDEN);
    }
    // Data Preparation
    const invoiceData = await TransactionEmailService.prepareInvoiceData(transaction, order, connection);

    // HTML Generation
    const htmlContent = TransactionEmailService.getInvoiceHtml(invoiceData);

    //  Puppeteer PDF Generation
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Crucial for Linux/Docker
      });

      const page = await browser.newPage();

      // Set content and wait until network is idle to ensure images/CSS are loaded
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      return Buffer.from(pdfBuffer);
    } catch (err) {
      console.error('CRITICAL: PDF Generation Failed => ', err);
      throw new AppError('Failed to generate PDF document', httpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      // ALWAYS close the browser process to prevent memory leaks
      if (browser) await browser.close();
    }
  };

  /**
   * GENERATE ORDER STATEMENT PDF
   * Shows all financial movements (Sales/Refunds) for one order
   */
  const generateOrderStatementPdf = async (orderNumber: string): Promise<Buffer> => {
    const order = await OrderModel.findOne({ orderNumber, storePreference });
    if (!order) throw new AppError('Order not found', httpStatus.NOT_FOUND);

    const statementData = await TransactionEmailService.prepareOrderStatementData(order, connection, storePreference);
    const htmlContent = TransactionEmailService.getStatementHtml(statementData);

    // 3. Puppeteer Logic (Standardized)
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
      console.error('Statement PDF Error:', err);
      throw new AppError('Statement generation failed', httpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      if (browser) await browser.close();
    }
  };

  const getOrderFinancialAudit = async (orderNumber: string) => {
    // 1. Fetch Order with Brand Security
    const order = await OrderModel.findOne({
      orderNumber,
      storePreference,
    }).lean();

    if (!order) {
      throw new AppError('Order not found in this store.', httpStatus.NOT_FOUND);
    }

    const transactions = await TransactionModel.find({
      order: order._id,
      storePreference,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'recordedBy',
        model: UserModel,
        select: 'email role',
        populate: {
          path: 'adminProfile',
          select: 'name',
        },
      })
      .lean();

    return {
      orderSummary: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        paidAmount: order.paymentInfo.paidAmount,
        dueAmount: order.paymentInfo.dueAmount,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentType: order.paymentInfo.paymentType || 'pending',
      },
      transactions: transactions.map((t) => {
        const adminData = (t.recordedBy as any)?.adminProfile;
        const name = adminData ? `${adminData.name}` : null;

        return {
          ...t,
          recordedBy: name || (t.recordedBy as any)?.email || 'System/Gateway',
        };
      }),
    };
  };

  return {
    addManualTransaction,
    createManualRefund,
    getRefundPreview,
    getAllTransactionsFromDB,
    getAllTransactionsByCustomer,
    getSingleTransaction,
    downloadInvoicePdf,
    generateOrderStatementPdf,
    getOrderFinancialAudit,
  };
};
