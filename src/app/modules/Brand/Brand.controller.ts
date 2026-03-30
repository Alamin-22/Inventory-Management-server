import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { BrandServices } from './Brand.service';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';

const createBrand: RequestHandler = catchAsync(async (req, res) => {
  const brandService = BrandServices(req.dbConnection!, req.brand!);
  const brandData = req.body;
  const file = req.file;

  const result = await brandService.createBrandIntoDB(brandData, file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Brand created successfully.',
    data: result,
  });
});

const getAllBrands: RequestHandler = catchAsync(async (req, res) => {
  const brandService = BrandServices(req.dbConnection!, req.brand!);

  const result = await brandService.getAllBrandsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All brands retrieved successfully.',
    data: result,
  });
});

const getBrandsForDashboard: RequestHandler = catchAsync(async (req, res) => {
  const brandService = BrandServices(req.dbConnection!, req.brand!);
  const result = await brandService.getAllBrandsForDashboardFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All brands retrieved successfully.',
    data: result,
  });
});

const getSingleBrand: RequestHandler = catchAsync(async (req, res) => {
  const brandService = BrandServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const result = await brandService.getSingleBrandFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Single brand retrieved successfully.',
    data: result,
  });
});

const updateBrand: RequestHandler = catchAsync(async (req, res) => {
  const brandService = BrandServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const payload = req.body;
  const file = req.file;

  const result = await brandService.updateBrandIntoDB(id, payload, file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Brand updated successfully.',
    data: result,
  });
});

const deleteBrand: RequestHandler = catchAsync(async (req, res) => {
  const brandService = BrandServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const result = await brandService.deleteBrandFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Brand deleted successfully.',
    data: result,
  });
});

export const BrandControllers = {
  createBrand,
  getAllBrands,
  getSingleBrand,
  updateBrand,
  deleteBrand,
  getBrandsForDashboard,
};
