import { RequestHandler } from 'express';
import { UserServices } from './user.service';
import sendResponse from '@utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';

const createStaffMember: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.createStaffMember(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Staff member created successfully',
    data: result,
  });
});

const deleteUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.deleteUser(req.params.id, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Staff member removed successfully',
    data: result,
  });
});

const changeStatus: RequestHandler = catchAsync(async (req, res) => {
  const result = await UserServices.changeUserStatus(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Staff member status updated successfully',
    data: result,
  });
});

export const UserControllers = {
  createStaffMember,
  deleteUser,
  changeStatus,
};
