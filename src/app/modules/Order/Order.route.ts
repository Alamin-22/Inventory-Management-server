import { Router } from 'express';
import { OptionalAuthMiddleWare } from '@app/middlewares/OptionalAuthMiddleWare';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import CheckAuthPermissionMiddleware from '@app/middlewares/CheckAuthPermissionMiddleware';
import { USER_ROLE } from '../user/user.constants';
import { AdminPermissions } from '@app/modules/admin/admin.constant';
import { OrderValidationSchemas } from './Order.Validation';
import { orderControllers } from './Order.controller';

const router = Router();

// --- 1. CORE POS/ORDER CREATION ---
// This single create order api is used for standard orders (POS + Public walk-in/FB)
router.post(
  '/create',
  OptionalAuthMiddleWare,
  ValidateRequestMiddleWare(OrderValidationSchemas.CreateOrderSchema),
  orderControllers.createOrder,
);

// --- 2. ORDER PROCESSING & FULFILLMENT ---
// Confirm the order after admin review
router.patch(
  '/confirm_by_admin',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  ValidateRequestMiddleWare(OrderValidationSchemas.ConfirmOrderSchema),
  orderControllers.confirmOrderHandler,
);

// Update order status (Shipped, Delivered, Cancelled)
router.patch(
  '/updated_by_admin/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  ValidateRequestMiddleWare(OrderValidationSchemas.updateOrderStatusSchema),
  orderControllers.updateOrderStatusByAdmin,
);

// --- 3. DASHBOARD & DATA FETCHING ---
// Get all active orders on the admin dashboard
router.get(
  '/',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  orderControllers.getAllOrders,
);

// Get archived orders
router.get(
  '/archived',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  orderControllers.getArchivedOrders,
);

// Get single order detail
router.get(
  '/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  orderControllers.getSingleOrder,
);

// --- 4. ARCHIVE & DELETION (High Privilege) ---
// Archive/soft-delete an order (restricted to full access/inventory to prevent accidental deletion)
router.delete(
  '/delete/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  orderControllers.deleteOrderByAdmin,
);

// Hard delete multiple archived orders (Super Admin / Full Access only)
router.delete(
  '/delete_multiple_archived',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.FULL_ACCESS),
  ValidateRequestMiddleWare(OrderValidationSchemas.deleteMultipleArchivedOrdersSchema),
  orderControllers.deleteMultipleArchivedOrders,
);

export const OrderRoutes = router;
