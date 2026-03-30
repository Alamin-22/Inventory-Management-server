/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { CommonServices } from './Common.service';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';
import { NewsLetterService } from '../Promotions/NewsLetter/NewsLetter.service';
import { TBrand } from '../auth/auth.interface';
import { SubjectOptions } from './Common.interface';

const getInquirySubjects: RequestHandler = catchAsync(async (_req, res) => {
  const subjects = SubjectOptions.map((opt) => ({
    value: opt,
    label: opt === 'other' ? 'Other (Please specify)' : opt.replace(/-/g, ' ').toUpperCase(),
  }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inquiry subjects retrieved successfully',
    data: subjects,
  });
});

const uploadMedia: RequestHandler = catchAsync(async (req, res) => {
  const files = req.files as any[];
  const service = CommonServices(req.dbConnection!, req.brand!);

  const result = await service.uploadMediaToCloud(files);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Media uploaded successfully!',
    data: result,
  });
});

const sendContactEmail: RequestHandler = catchAsync(async (req, res) => {
  const service = CommonServices(req.dbConnection!, req.brand!);
  const result = await service.sendContactInquiryEmail(req.body);

  // Sync to Newsletter - Non-blocking
  NewsLetterService(req.dbConnection!, req.brand as TBrand)
    .syncSubscriber({
      email: req.body.email,
      name: req.body.name,
      source: 'contact-form',
    })
    .catch((err) => console.error('Newsletter Sync Error (Contact):', err));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your inquiry has been sent to our team.',
    data: result,
  });
});

const getAllInquiries: RequestHandler = catchAsync(async (req, res) => {
  const service = CommonServices(req.dbConnection!, req.brand!);
  const result = await service.getAllInquiriesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inquiries retrieved successfully!',
    data: result,
  });
});

const updateInquiryStatus: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const service = CommonServices(req.dbConnection!, req.brand!);

  const result = await service.updateInquiryStatus(id, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Inquiry status updated to ${status}.`,
    data: result,
  });
});

const bulkDeleteInquiries: RequestHandler = catchAsync(async (req, res) => {
  const { ids } = req.body;
  const service = CommonServices(req.dbConnection!, req.brand!);

  const result = await service.bulkDeleteInquiriesFromDB(ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.deletedCount} inquiries and associated contact-leads deleted successfully.`,
    data: null,
  });
});

export const CommonControllers = {
  uploadMedia,
  sendContactEmail,
  getAllInquiries,
  updateInquiryStatus,
  bulkDeleteInquiries,
  getInquirySubjects,
};
