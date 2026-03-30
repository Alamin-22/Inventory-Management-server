import { catchAsync } from '@utils/catchAsync';
import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import sendResponse from '@utils/sendResponse';
import { CategoryServices } from './Category.service';
import { TBrand } from '@app/modules/auth/auth.interface';
import { CategoryBannerServices } from '../CategoryBanner/CategoryBanner.service';

const createCategory: RequestHandler = catchAsync(async (req, res) => {
  const categoryService = CategoryServices(req.dbConnection!, req.brand!);
  const result = await categoryService.createCategoryIntoDB(req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category created Successfully.',
    data: result,
  });
});

const getAllCategories: RequestHandler = catchAsync(async (req, res) => {
  const categoryService = CategoryServices(req.dbConnection!, req.brand!);
  const result = await categoryService.getAllCategoriesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All Categories retrieve Successfully',
    data: result,
  });
});

const getSingleCategory: RequestHandler = catchAsync(async (req, res) => {
  const categoryService = CategoryServices(req.dbConnection!, req.brand!);
  const identifier = req.params.id;
  const result = await categoryService.getSingleCategoryFromDB(identifier);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Single Category is retrieve Successfully',
    data: result,
  });
});

const updateCategory: RequestHandler = catchAsync(async (req, res) => {
  const categoryService = CategoryServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const result = await categoryService.updateCategoryIntoDB(id, req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category Updated Successfully',
    data: result,
  });
});

const deleteCategory: RequestHandler = catchAsync(async (req, res) => {
  const categoryService = CategoryServices(req.dbConnection!, req.brand!);
  const categoryId = req.params.id;

  // Delete categories and get all affected IDs (Parent + Children)
  const { deletedCategory, affectedIds } = await categoryService.deleteCategoryFromDB(categoryId);

  const bannerService = CategoryBannerServices(req.dbConnection!, req.brand as TBrand);

  //  Just pass the array of IDs everything will be handled via the function.
  await bannerService.removeBannerByCategoryId(affectedIds);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category, sub-categories, and all associated banners purged successfully',
    data: deletedCategory,
  });
});

const reOrderCategories: RequestHandler = catchAsync(async (req, res) => {
  const categoryService = CategoryServices(req.dbConnection!, req.brand!);

  const result = await categoryService.reorderCategoriesInDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'categories reordered successfully',
    data: result,
  });
});

export const CategoryControllers = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  deleteCategory,
  updateCategory,
  reOrderCategories,
};
