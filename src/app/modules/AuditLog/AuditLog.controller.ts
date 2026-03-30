import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import httpStatus from 'http-status';
import { TBrand } from '../auth/auth.interface';
import sendResponse from '@utils/sendResponse';
import { AuditLogServices } from './AuditLog.service';

const getAllLogs = catchAsync(async (req: Request, res: Response) => {
  const service = AuditLogServices(req.dbConnection!, req.brand as TBrand);
  const result = await service.getAllLogsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Audit logs retrieved successfully',
    data: result,
  });
});

export const AuditLogControllers = {
  getAllLogs,
};
