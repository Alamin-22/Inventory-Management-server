import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';
import { OrderServices } from './Order.service';

const createOrder: RequestHandler = catchAsync(async (req, res) => {
  // If the request comes from an authenticated POS/Dashboard user, capture their ID for the Audit Trail.
  // If it's a public Facebook/Web form, req.user will be undefined (handled safely by OptionalAuthMiddleWare).
  const adminId = req.user?.id;

  const order = await OrderServices.createOrderIntoDB(req.body, adminId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Order placed successfully!',
    data: order,
  });
});

const confirmOrderHandler: RequestHandler = catchAsync(async (req, res) => {
  // Inject the admin ID from the token for the Audit Trail
  const payload = { ...req.body, adminId: req.user.id };
  const order = await OrderServices.confirmOrderByAdmin(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order confirmed and financials recalculated successfully!',
    data: order,
  });
});

const updateOrderStatusByAdmin: RequestHandler = catchAsync(async (req, res) => {
  const orderId = req.params.orderId;
  const { newStatus, notes, notifyCustomer } = req.body;
  const adminId = req.user.id;

  const order = await OrderServices.updateOrderStatusByAdmin(orderId, newStatus, adminId, notes, notifyCustomer);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Order Status updated to ${newStatus}`,
    data: order,
  });
});

const getAllOrders: RequestHandler = catchAsync(async (req, res) => {
  const order = await OrderServices.getAllOrdersFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Orders retrieved successfully',
    data: order,
  });
});

const getSingleOrder: RequestHandler = catchAsync(async (req, res) => {
  const orderId = req.params.orderId;

  const order = await OrderServices.getSingleOrderFromDB(orderId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: order.isDeleted ? 'Archived order retrieved!' : 'Order retrieved successfully!',
    data: order,
  });
});

const getArchivedOrders: RequestHandler = catchAsync(async (req, res) => {
  const order = await OrderServices.getArchivedOrdersFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Archived orders retrieved successfully',
    data: order,
  });
});

const deleteOrderByAdmin: RequestHandler = catchAsync(async (req, res) => {
  const orderId = req.params.orderId;

  const order = await OrderServices.deleteOrderByAdmin(orderId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order safely archived.',
    data: order,
  });
});

const deleteMultipleArchivedOrders = catchAsync(async (req, res) => {
  const order_ids = req.body.order_ids;

  const result = await OrderServices.deleteArchivedOrdersPermanentlyFromDB(order_ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bulk hard-deletion completed successfully',
    data: result,
  });
});

export const orderControllers = {
  createOrder,
  confirmOrderHandler,
  updateOrderStatusByAdmin,
  getAllOrders,
  getSingleOrder,
  getArchivedOrders,
  deleteOrderByAdmin,
  deleteMultipleArchivedOrders,
};
