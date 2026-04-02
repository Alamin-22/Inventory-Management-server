import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '@utils/sendResponse';
import { AuditLogServices } from './AuditLog.service';

const getAllLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditLogServices.getAllLogsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Security audit logs retrieved successfully.',
    data: result,
  });
});

export const AuditLogControllers = { getAllLogs };
