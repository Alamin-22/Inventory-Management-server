import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '@app/modules/user/user.constants';
import express from 'express';
import { TransactionControllers } from './Transaction.controller';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { TransactionValidations } from './Transaction.validation';

const router = express.Router();

// =========================================================
//  CUSTOMER ROUTES
// =========================================================

// Get personal payment history
router.get(
  '/my-transactions',
  AuthValidationMiddleWare(USER_ROLE.customer),
  TransactionControllers.getAllTransactionsByCustomer,
);

// Download specific invoice
router.get(
  '/download-invoice/:transactionId',
  AuthValidationMiddleWare(USER_ROLE.customer, USER_ROLE.admin, USER_ROLE.super_admin),
  TransactionControllers.downloadInvoicePdf,
);

// =========================================================
// 🛡️ ADMIN ROUTES
// =========================================================

// Global Ledger View
//transactions
router.get(
  '/',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  TransactionControllers.getAllTransactions,
);

// Order specific financial audit
router.get(
  '/audit/:orderNumber',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  TransactionControllers.getOrderFinancialAudit,
);

// Get Refund Preview (Before processing)
router.get(
  '/refund-preview/:orderNumber',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  TransactionControllers.getRefundPreview,
);

// Record Manual Payment
router.post(
  '/manual-payment/:orderNumber',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(TransactionValidations.addManualTransactionSchema),
  TransactionControllers.addManualTransaction,
);

// Record Manual Refund
router.post(
  '/manual-refund/:orderNumber',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(TransactionValidations.createManualRefundSchema),
  TransactionControllers.createManualRefund,
);

// Download Full Order Statement
router.get(
  '/download-statement/:orderNumber',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  TransactionControllers.downloadOrderStatementPdf,
);

router.get(
  '/:transactionId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin, USER_ROLE.customer),
  TransactionControllers.getSingleTransaction,
);

export const TransactionRoutes = router;
