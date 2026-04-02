import { RequestHandler } from 'express';
import { AdminServices } from './admin.service';
import sendResponse from '@utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';
import { PermissionManifest } from './admin.constant';

const getAdminPermissionsMeta: RequestHandler = catchAsync(async (_req, res) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin permissions metadata retrieved successfully',
    data: PermissionManifest,
  });
});

const getAllAdmins: RequestHandler = catchAsync(async (req, res) => {
  const result = await AdminServices.getAllAdmins(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Staff retrieved successfully',
    data: result,
  });
});

const getSingleAdmin: RequestHandler = catchAsync(async (req, res) => {
  const result = await AdminServices.getSingleAdmin(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Staff profile retrieved ', data: result });
});

const updateAdmin: RequestHandler = catchAsync(async (req, res) => {
  const result = await AdminServices.updateAdmin(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Staff profile updated', data: result });
});

export const AdminControllers = {
  getAdminPermissionsMeta,
  getAllAdmins,
  getSingleAdmin,
  updateAdmin,
};
