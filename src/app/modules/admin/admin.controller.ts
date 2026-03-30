import { RequestHandler } from 'express';
import { AdminServices } from './admin.service';
import sendResponse from '@utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';
import { PermissionManifest } from './admin.constants';

const getAllAdmins: RequestHandler = catchAsync(async (req, res) => {
  const adminService = AdminServices(req.dbConnection);

  const result = await adminService.getAllAdmins(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admins retrieved successfully',
    data: result,
  });
});

const getSingleAdmin: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminService = AdminServices(req.dbConnection);
  const result = await adminService.getSingleAdmin(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin retrieved successfully',
    data: result,
  });
});

const updateAdmin: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminService = AdminServices(req.dbConnection);
  // Validation handled by middleware, data is safe to use directly
  const result = await adminService.updateAdmin(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin updated successfully',
    data: result,
  });
});

const deleteAdmin: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const adminService = AdminServices(req.dbConnection);
  const result = await adminService.deleteAdmin(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin deleted successfully',
    data: result,
  });
});

const getPermissionMetadata: RequestHandler = catchAsync(async (_req, res) => {
  // Transform the Object into an Array of Objects
  const manifestArray = Object.entries(PermissionManifest).map(([key, value]) => ({
    permission: key,
    label: value.label,
    description: value.description,
  }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission manifest retrieved successfully',
    data: manifestArray,
  });
});

export const AdminControllers = {
  getAllAdmins,
  getSingleAdmin,
  updateAdmin,
  deleteAdmin,
  getPermissionMetadata,
};
