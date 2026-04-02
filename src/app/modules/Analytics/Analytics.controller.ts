import { catchAsync } from '@utils/catchAsync';
import { AnalyticsServices } from './Analytics.service';
import sendResponse from '@utils/sendResponse';
import httpStatus from 'http-status';

const getDashboardSummary = catchAsync(async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const month = req.query.month ? parseInt(req.query.month as string) : undefined;
  const data = await AnalyticsServices.getDashboardSummary(year, month);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Dashboard data fetched.', data });
});

const getRestockQueue = catchAsync(async (_req, res) => {
  const data = await AnalyticsServices.getRestockQueue();
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Restock queue fetched.', data });
});

export const AnalyticsControllers = { getDashboardSummary, getRestockQueue };
