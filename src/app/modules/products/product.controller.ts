import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';
import { ProductServices } from './product.service';

const createProduct: RequestHandler = catchAsync(async (req, res) => {
  const result = await ProductServices.createProductIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inventory product created successfully.',
    data: result,
  });
});

// Used by POS terminals
const getAllProducts: RequestHandler = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllPublishedProductsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'POS Products retrieved successfully.',
    data: result,
  });
});

// Used by Admin/Manager Dashboard
const getAllProductsForDashboard: RequestHandler = catchAsync(async (req, res) => {
  const result = await ProductServices.getAllProductsForDashboardFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard products retrieved successfully.',
    data: result,
  });
});

const getSingleProduct: RequestHandler = catchAsync(async (req, res) => {
  const { identifier } = req.params;
  const result = await ProductServices.getSingleProductFromDB(identifier);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product retrieved successfully.',
    data: result,
  });
});

const updateProduct: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ProductServices.updateProductIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inventory product updated successfully.',
    data: result,
  });
});

const toggleStatus = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await ProductServices.toggleProductStatus(id, req.body.isPublished);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Product ${result.isPublished ? 'published' : 'unpublished'} successfully`,
    data: result,
  });
});

const deleteProduct: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ProductServices.softDeleteProductFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product archived successfully.',
    data: result,
  });
});

const restoreProduct: RequestHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ProductServices.restoreArchivedProductIntoDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product restored to Draft successfully.',
    data: result,
  });
});

const getArchivedProductsForDashboard: RequestHandler = catchAsync(async (req, res) => {
  const result = await ProductServices.getArchivedProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Archived products retrieved successfully.',
    data: result,
  });
});

const deleteProductsPermanently: RequestHandler = catchAsync(async (req, res) => {
  const { productIds } = req.body;

  const result = await ProductServices.deleteProductsPermanentlyFromDB(productIds);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Archived products permanently deleted successfully.',
    data: result,
  });
});

export const ProductControllers = {
  createProduct,
  getAllProducts,
  getAllProductsForDashboard,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  toggleStatus,
  getArchivedProductsForDashboard,
  deleteProductsPermanently,
};
