import express from 'express';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import CheckAuthPermissionMiddleware from '@app/middlewares/CheckAuthPermissionMiddleware';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { USER_ROLE } from '@app/modules/user/user.constants';
import { AdminPermissions } from '@app/modules/admin/admin.constant';
import { TransactionControllers } from './Transaction.controller';
import { TransactionValidations } from './Transaction.validation';

const router = express.Router();

// 1. ADMIN LEDGER ACCESS

router.get(
  '/',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.VIEW_ANALYTICS),
  TransactionControllers.getAllTransactions,
);

// 2. POS OPERATIONS (Payments & Refunds)
router.get(
  '/audit/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  TransactionControllers.getOrderFinancialAudit,
);

router.post(
  '/manual-payment/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  ValidateRequestMiddleWare(TransactionValidations.addManualTransactionSchema),
  TransactionControllers.addManualTransaction,
);

router.get(
  '/refund-preview/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  TransactionControllers.getRefundPreview,
);

router.post(
  '/manual-refund/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  ValidateRequestMiddleWare(TransactionValidations.createManualRefundSchema),
  TransactionControllers.createManualRefund,
);

router.get(
  '/download-invoice/:transactionId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  TransactionControllers.downloadInvoicePdf,
);

router.get(
  '/:transactionId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  TransactionControllers.getSingleTransaction,
);

export const TransactionRoutes = router;
