import { RequestHandler } from 'express';
import { CustomerServices } from './customer.service';
import sendResponse from '@utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';

const createCustomer: RequestHandler = catchAsync(async (req, res) => {
  const result = await CustomerServices.createCustomer(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Customer CRM profile created successfully',
    data: result,
  });
});

const getAllCustomers: RequestHandler = catchAsync(async (req, res) => {
  const result = await CustomerServices.getAllCustomers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customers retrieved successfully',
    data: result,
  });
});

const getSingleCustomer: RequestHandler = catchAsync(async (req, res) => {
  const result = await CustomerServices.getSingleCustomer(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer retrieved successfully',
    data: result,
  });
});

const updateCustomer: RequestHandler = catchAsync(async (req, res) => {
  const result = await CustomerServices.updateCustomer(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer updated successfully',
    data: result,
  });
});

const deleteCustomer: RequestHandler = catchAsync(async (req, res) => {
  const result = await CustomerServices.deleteCustomer(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer deleted successfully',
    data: result,
  });
});

export const CustomerControllers = {
  createCustomer,
  getAllCustomers,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
};
