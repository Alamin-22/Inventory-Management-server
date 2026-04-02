import { catchAsync } from '@utils/catchAsync';
import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { TransactionServices } from './Transaction.service';
import sendResponse from '@utils/sendResponse';

const addManualTransaction: RequestHandler = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const adminId = req.user.id;

  const result = await TransactionServices.addManualTransaction(orderId, req.body, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Manual transaction recorded and order summary updated.',
    data: result,
  });
});

const createManualRefund: RequestHandler = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const adminId = req.user.id;

  const result = await TransactionServices.createManualRefund(orderId, req.body, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Refund processed and ledger balanced.',
    data: result,
  });
});

const getRefundPreview: RequestHandler = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const result = await TransactionServices.getRefundPreview(orderId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Refund breakdown retrieved.',
    data: result,
  });
});

const getAllTransactions: RequestHandler = catchAsync(async (req, res) => {
  const result = await TransactionServices.getAllTransactionsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'System ledger retrieved successfully.',
    data: result,
  });
});

const getSingleTransaction: RequestHandler = catchAsync(async (req, res) => {
  const { transactionId } = req.params;
  const result = await TransactionServices.getSingleTransaction(transactionId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Transaction details retrieved.',
    data: result,
  });
});

const getOrderFinancialAudit: RequestHandler = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const result = await TransactionServices.getOrderFinancialAudit(orderId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Financial audit for order completed.',
    data: result,
  });
});

const downloadInvoicePdf: RequestHandler = catchAsync(async (req, res) => {
  const { transactionId } = req.params;
  const pdfBuffer = await TransactionServices.downloadInvoicePdf(transactionId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Receipt-${transactionId}.pdf`);
  res.send(pdfBuffer);
});

export const TransactionControllers = {
  addManualTransaction,
  createManualRefund,
  getRefundPreview,
  getAllTransactions,
  getSingleTransaction,
  getOrderFinancialAudit,
  downloadInvoicePdf,
};
