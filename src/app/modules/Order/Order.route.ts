import { OptionalAuthMiddleWare } from '@app/middlewares/OptionalAuthMiddleWare';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { Router } from 'express';
import { OrderValidationSchemas } from './Order.Validation';
import { orderControllers } from './Order.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

// this single create order api is used for both pre and standard order
router.post(
  '/create',
  OptionalAuthMiddleWare,
  ValidateRequestMiddleWare(OrderValidationSchemas.CreateOrderSchema),
  orderControllers.createOrder,
);

/**
 * @route   POST /api/v1/group-buy/join-campaign
 * @desc    Initialize joining a deal and get payment URL
 * @access  Public (Optional Auth for logged-in users)
 */
router.post(
  '/join-campaign',
  OptionalAuthMiddleWare,
  ValidateRequestMiddleWare(OrderValidationSchemas.joinGroupBuyCampaignSchema),
  orderControllers.joinGroupBuyCampaign,
);

// order/confirm api is used to confirm the order after admin review
router.patch(
  '/confirm_by_admin',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(OrderValidationSchemas.ConfirmOrderSchema),
  orderControllers.confirmOrderHandler,
);

// order/send_payment_reminder api
router.post(
  '/send_payment_reminder',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(OrderValidationSchemas.sendPaymentReminderSchema),
  orderControllers.sendPaymentReminder,
);

// /orders api for get all orders on the admin dashboard
router.get('/', AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin), orderControllers.getAllOrders);

// /archived api for get all orders on the admin dashboard
router.get(
  '/archived',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  orderControllers.getArchivedOrders,
);

// this api is used to get all orders for specific customer
router.get('/customer', AuthValidationMiddleWare(USER_ROLE.customer), orderControllers.getAllOrdersForCustomer);

// send reminder to abandoned orders
router.post(
  '/send_reminder_to_abandoned_orders',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(OrderValidationSchemas.sendReminderToAbandonedSchema),
  orderControllers.sendReminderToAbandonedOrders,
);

// cancel pending or confirmed order
router.patch(
  '/cancel_by_customer/:orderId/:token',
  OptionalAuthMiddleWare,
  orderControllers.cancelPendingOrConfirmOrderByCustomer,
);

// Reorder by Customer
router.post('/apply_reorder/:orderNumber', orderControllers.ReOrderConfirmedByCustomer);

// update order status
router.patch(
  '/updated_by_admin/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(OrderValidationSchemas.updateOrderStatusSchema),
  orderControllers.updateOrderStatusByAdmin,
);

// delete order by admin
router.delete(
  '/delete/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  orderControllers.deleteOrderByAdmin,
);

// delete multiple archived orders by admin
router.delete(
  '/delete_multiple_archived',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(OrderValidationSchemas.deleteMultipleArchivedOrdersSchema),
  orderControllers.deleteMultipleArchivedOrders,
);

router.get('/:orderNumber/:viewerId', orderControllers.getSingleTrackingOrder);

// /orders/orderid => is to get single order
router.get(
  '/:orderId',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin, USER_ROLE.customer),
  orderControllers.getSingleOrder,
);

export const OrderRoutes = router;
