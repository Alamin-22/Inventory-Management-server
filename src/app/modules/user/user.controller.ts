import { RequestHandler } from 'express';
import { UserServices } from './user.service';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';
import { TBrand } from '../auth/auth.interface';

const createCustomer: RequestHandler = catchAsync(async (req, res) => {
  const { customer, password } = req.body;

  /* 
  const userService = UserServices(req.dbConnection,req.brand as TBrand); is the wrapper here. We used this wrapper to pass the current database connect depending on the domain(tenant). so that all the operations inside the service will be performed on the correct database

  If we do not use this wrapper then we have to manually pass the connection to every single function inside the service from this controller as a parameter which is tedious and error-prone

  and this must be set above all the function calls inside controller 
  */

  const userService = UserServices(req.dbConnection, req.brand as TBrand);

  const result = await userService.createCustomerIntoDB(req.file, {
    customer,
    password,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer created successfully!',
    data: result,
  });
});

const createAdmin: RequestHandler = catchAsync(async (req, res) => {
  const { admin, password } = req.body;
  const userService = UserServices(req.dbConnection, req.brand as TBrand);
  const result = await userService.createAdminIntoDB(req.file, {
    admin,
    password,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin created successfully',
    data: result,
  });
});

const changeStatus: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params.id; // User ID
  const userService = UserServices(req.dbConnection, req.brand as TBrand);
  const result = await userService.changeStatus(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully',
    data: result,
  });
});

const getMe: RequestHandler = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const userService = UserServices(req.dbConnection, req.brand as TBrand);
  const result = await userService.getMe(userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile retrieved successfully',
    data: result,
  });
});

const getAllUsers: RequestHandler = catchAsync(async (req, res) => {
  const userService = UserServices(req.dbConnection, req.brand as TBrand);

  const result = await userService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully',
    data: result,
  });
});

const getSingleUser: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userService = UserServices(req.dbConnection, req.brand as TBrand);
  const result = await userService.getSingleUser(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User retrieved successfully',
    data: result,
  });
});

const deleteUser: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userService = UserServices(req.dbConnection, req.brand as TBrand);
  const result = await userService.deleteUser(id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

const updateAdminProfile: RequestHandler = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const service = UserServices(req.dbConnection!, req.brand as TBrand);

  const payload = req.body.data ? JSON.parse(req.body.data) : req.body;

  const result = await service.updateAdminProfile(userId, payload, req.file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin profile updated successfully',
    data: result,
  });
});

const updateCustomerProfile: RequestHandler = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const service = UserServices(req.dbConnection!, req.brand as TBrand);

  const payload = req.body.data ? JSON.parse(req.body.data) : req.body;

  const result = await service.updateCustomerProfile(userId, payload, req.file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer profile updated successfully',
    data: result,
  });
});

export const UserControllers = {
  createCustomer,
  createAdmin,
  getAllUsers,
  getSingleUser,
  deleteUser,
  changeStatus,
  getMe,
  updateAdminProfile,
  updateCustomerProfile,
};
