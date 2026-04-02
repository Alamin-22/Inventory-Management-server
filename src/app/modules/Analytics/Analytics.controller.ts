import { catchAsync } from '@utils/catchAsync';
import { AnalyticsServices } from './Analytics.service';
import sendResponse from '@utils/sendResponse';
import httpStatus from 'http-status';

const getDashboardSummary = catchAsync(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;

  const data = await AnalyticsServices.getDashboardSummary(year, month);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard data fetched successfully.',
    data,
  });
});

const getRestockQueue = catchAsync(async (_req, res) => {
  const data = await AnalyticsServices.getRestockQueue();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Restock queue fetched successfully.',
    data,
  });
});

export const AnalyticsControllers = {
  getDashboardSummary,
  getRestockQueue,
};
