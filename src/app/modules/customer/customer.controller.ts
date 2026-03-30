import { RequestHandler } from 'express';
import { CustomerServices } from './customer.service';
import sendResponse from '@utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';

const getAllCustomers: RequestHandler = catchAsync(async (req, res) => {
  const customerService = CustomerServices(req.dbConnection);

  const result = await customerService.getAllCustomers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customers retrieved successfully',
    data: result,
  });
});

const getSingleCustomer: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;

  const customerService = CustomerServices(req.dbConnection);
  const result = await customerService.getSingleCustomer(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer retrieved successfully',
    data: result,
  });
});

const updateCustomer: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const customerService = CustomerServices(req.dbConnection);
  const result = await customerService.updateCustomer(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer updated successfully',
    data: result,
  });
});

const deleteCustomer: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const customerService = CustomerServices(req.dbConnection);
  const result = await customerService.deleteCustomer(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer deleted successfully',
    data: result,
  });
});

export const CustomerControllers = {
  getAllCustomers,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
};
