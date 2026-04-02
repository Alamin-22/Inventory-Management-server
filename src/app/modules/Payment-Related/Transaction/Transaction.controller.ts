import { catchAsync } from '@utils/catchAsync';
import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { TransactionServices } from './Transaction.service';
import { TBrand } from '@app/modules/auth/auth.interface';
import sendResponse from '@utils/sendResponse';

const addManualTransaction: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const { orderNumber } = req.params;
  const adminId = req.user.userId;

  const result = await service.addManualTransaction(orderNumber, req.body, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Manual transaction recorded successfully.',
    data: result,
  });
});

const createManualRefund: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const { orderNumber } = req.params;
  const adminId = req.user.userId;

  const result = await service.createManualRefund(orderNumber, req.body, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Refund processed and ledger balanced.',
    data: result,
  });
});

const getRefundPreview: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const { orderNumber } = req.params;

  const result = await service.getRefundPreview(orderNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Refund calculations retrieved.',
    data: result,
  });
});

const getAllTransactions: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);

  const result = await service.getAllTransactionsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ledger retrieved successfully.',
    data: result,
  });
});

const getSingleTransaction: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const { transactionId } = req.params;
  const viewerId = req.user.userId;
  const role = req.user.role;

  const result = await service.getSingleTransaction(transactionId, viewerId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Transaction details retrieved successfully.',
    data: result,
  });
});

const getOrderFinancialAudit: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const { orderNumber } = req.params;

  const result = await service.getOrderFinancialAudit(orderNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order financial history retrieved.',
    data: result,
  });
});

const downloadInvoicePdf: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const { transactionId } = req.params;
  const viewerId = req.user.userId;
  const role = req.user.role;
  const pdfBuffer = await service.downloadInvoicePdf(transactionId, viewerId, role);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Invoice-${transactionId}.pdf`);
  res.send(pdfBuffer);
});

const downloadOrderStatementPdf: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const { orderNumber } = req.params;

  const pdfBuffer = await service.generateOrderStatementPdf(orderNumber);

  res.writeHead(httpStatus.OK, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=Statement-${orderNumber}.pdf`,
    'Content-Length': pdfBuffer.length,
  });

  return res.end(pdfBuffer, 'binary');
});

const getAllTransactionsByCustomer: RequestHandler = catchAsync(async (req, res) => {
  const service = TransactionServices(req.dbConnection!, req.brand as TBrand);
  const customerId = req.user.userId;

  const result = await service.getAllTransactionsByCustomer(customerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your payment history retrieved.',
    data: result,
  });
});

export const TransactionControllers = {
  addManualTransaction,
  createManualRefund,
  getRefundPreview,
  getAllTransactions,
  getSingleTransaction,
  getOrderFinancialAudit,
  downloadInvoicePdf,
  downloadOrderStatementPdf,
  getAllTransactionsByCustomer,
};
