import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { OrderServices } from './Order.service';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';
import { TBrand } from '../auth/auth.interface';
import { AppError } from '@app/classes/AppError';
import { NewsLetterService } from '../Promotions/NewsLetter/NewsLetter.service';
import { OrderGroupBuyService } from './Order.group-buy.service';
import { Types } from 'mongoose';
import { isProduction } from '../Cart/Cart.controller';
import { config } from '@config/env';
import { CartServices } from '../Cart/Cart.service';
import { SubscriberSource } from '../Promotions/NewsLetter/NewsLetter.interface';

const createOrder: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const key = req.user ? { user: req.user.id } : { guestId: req.cookies.guestId };

  const order = await service.createOrderIntoDB(key, req.body);

  NewsLetterService(req.dbConnection!, req.brand as TBrand)
    .syncSubscriber({
      email: order.email,
      name: order.shippingAddress.name,
      source: 'order-checkout',
    })
    .catch((err) => console.error('Newsletter Sync Error:', err));

  const label = order.orderType === 'pre-order' ? 'Pre-order' : 'Order';

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${label} placed successfully!`,
    data: order,
  });
});

const joinGroupBuyCampaign: RequestHandler = catchAsync(async (req, res) => {
  const groupBuyService = OrderGroupBuyService(req.dbConnection!, req.brand as TBrand);
  const cartService = CartServices(req.dbConnection!, req.brand as TBrand);

  const userId = req.user?.id;
  let guestId = req.cookies.guestId as string | undefined;

  let key: { user?: string; guestId?: string };

  //  IDENTITY ORCHESTRATION
  if (userId) {
    key = { user: userId };
  } else if (guestId) {
    key = { guestId };
  } else {
    // SCENARIO: User landed directly on the Campaign Page
    // Trigger Guest creation to get a valid guestId
    const newCart = await cartService.createGuestCart();
    guestId = newCart.guestId;
    key = { guestId };

    // COOKIE ATTACHMENT
    const clientConfig = config.client[req.brand!];
    const cookieDomain = clientConfig?.domain;

    res.cookie('guestId', guestId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      domain: isProduction ? cookieDomain : undefined,
    });
  }

  // EXECUTE JOIN DEAL
  const result = await groupBuyService.joinGroupBuyCampaign(key, {
    campaignId: new Types.ObjectId(req.body.campaignId),
    shippingAddress: req.body.shippingAddress,
    email: req.body.email,
    gateway: req.body.gateway,
    quantity: req.body.quantity,
  });

  // NON-BLOCKING NEWSLETTER SYNC
  NewsLetterService(req.dbConnection!, req.brand as TBrand)
    .syncSubscriber({
      email: result.order.email,
      name: result.order.shippingAddress.name,
      source: SubscriberSource.GROUP_BUY_ORDER_CHECKOUT,
    })
    .catch((err) => console.error('Newsletter Sync Error:', err));

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Collective deal joined successfully. Redirecting to secure payment...',
    data: result,
  });
});

const confirmOrderHandler: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const order = await service.confirmOrderByAdmin(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order has been confirmed successfully!',
    data: order,
  });
});

const sendPaymentReminder: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const orderNumber = req.body.orderNumber;

  const result = await service.sendPaymentReminderToPartialPaidCustomer(orderNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment Reminder has been sent to the customer!',
    data: result,
  });
});

const getAllOrders: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const order = await service.getAllOrdersFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All orders retrieved successfully',
    data: order,
  });
});

const getSingleOrder: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const orderNumber = req.params.orderId;

  const order = await service.getSingleOrderFromDB(orderNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: order.isDeleted ? 'Archived order retrieved!' : 'Order retrieved successfully!',
    data: order,
  });
});

const getSingleTrackingOrder: RequestHandler = catchAsync(async (req, res, next) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const { orderNumber, viewerId } = req.params;

  const order = await service.getSingleOrderFromDB(orderNumber);

  const ownerId = order.user?.toString() || order.guestId;
  if (ownerId !== viewerId) {
    return next(new AppError('You are not authorized to view this order', httpStatus.FORBIDDEN));
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order retrieved',
    data: order,
  });
});

const getAllOrdersForCustomer: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const user = req.user.id;

  const order = await service.getMyOrdersFromDB_byCustomer(user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My orders retrieved successfully',
    data: order,
  });
});

const cancelPendingOrConfirmOrderByCustomer: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const orderNumber = req.params.orderId;
  const cancelToken = req.params.token;
  const user = req.user.id;

  // 1. Strict Token Format Check
  if (!cancelToken || cancelToken.length < 32) {
    throw new AppError('Invalid or malformed cancellation token.', httpStatus.BAD_REQUEST);
  }

  const order = await service.cancelOrderByCustomer(orderNumber, cancelToken, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order has been cancelled successfully!',
    data: order,
  });
});

const ReOrderConfirmedByCustomer: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const orderNumber = req.params.orderNumber;

  const order = await service.reOrderByCustomer(orderNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reorder Confirmed!!',
    data: order,
  });
});

const updateOrderStatusByAdmin: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const orderNumber = req.params.orderId;

  const { newStatus, notes, notifyCustomer } = req.body;

  const adminId = req.user.id;

  const order = await service.updateOrderStatusByAdmin(orderNumber, newStatus, adminId, notes, notifyCustomer);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Order Status has been updated to ${newStatus}`,
    data: order,
  });
});

const deleteOrderByAdmin: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const orderNumber = req.params.orderId;

  const order = await service.deleteOrderByAdmin(orderNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Order has been deleted.`,
    data: order,
  });
});

const getArchivedOrders: RequestHandler = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const order = await service.getArchivedOrdersFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All archived orders retrieved successfully',
    data: order,
  });
});

const deleteMultipleArchivedOrders = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const order_ids = req.body.order_ids;

  const result = await service.deleteArchivedOrdersPermanentlyFromDB(order_ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bulk deletion completed successfully',
    data: result,
  });
});

const sendReminderToAbandonedOrders = catchAsync(async (req, res) => {
  const service = OrderServices(req.dbConnection!, req.brand as TBrand);
  const orderNumbers = req.body.orderNumbers;

  const result = await service.sendAbandonedOrderReminders(orderNumbers);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully sent Reminder Emails to the abandoned orders',
    data: result,
  });
});

// const resetAllOrderData: RequestHandler = catchAsync(async (req, res) => {
//   const service = OrderServices(req.dbConnection!, req.brand as TBrand);
//   const summary = await service.deleteAllOrderAndPaymentData();
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: '[DANGEROUS] All Order, Payment, and Transaction data has been permanently deleted.',
//     data: summary,
//   });
// });

export const orderControllers = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  getArchivedOrders,
  deleteOrderByAdmin,
  confirmOrderHandler,
  sendPaymentReminder,
  getSingleTrackingOrder,
  getAllOrdersForCustomer,
  updateOrderStatusByAdmin,
  ReOrderConfirmedByCustomer,
  deleteMultipleArchivedOrders,
  sendReminderToAbandonedOrders,
  cancelPendingOrConfirmOrderByCustomer,
  joinGroupBuyCampaign,
  // resetAllOrderData,
};
