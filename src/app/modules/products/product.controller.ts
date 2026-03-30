import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';
import { ProductServices } from './product.service';
import { CollectionServices } from '../Home-PageRelated-Sections/Collections/Collection.service';
import { TBrand } from '../auth/auth.interface';

const createProduct: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const result = await service.createProductIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product created successfully.',
    data: result,
  });
});

const getAllProducts: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const result = await service.getAllPublishedProductsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Products retrieved successfully.',
    data: result,
  });
});

const getRelatedProducts = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { identifier } = req.params;
  const { limit } = req.query;

  const result = await service.getRelatedProductsFromDB(identifier, limit ? Number(limit) : 10);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Related products retrieved successfully',
    data: result,
  });
});

const getAllProductsForDashboard: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const result = await service.getAllProductsForDashboardFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard products retrieved successfully.',
    data: result,
  });
});

const getSingleProduct: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { identifier } = req.params;
  const result = await service.getSingleProductFromDB(identifier);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product retrieved successfully.',
    data: result,
  });
});

const updateProduct: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const result = await service.updateProductIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product updated successfully.',
    data: result,
  });
});

const toggleStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const service = ProductServices(req.dbConnection!, req.brand!);

  const result = await service.toggleProductStatus(id, req.body.isPublished);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Product ${result.isPublished ? 'published' : 'unpublished'} successfully`,
    data: result,
  });
});

const deleteProduct: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const result = await service.softDeleteProductFromDB(id);

  const collectionService = CollectionServices(req.dbConnection!, req.brand as TBrand);

  await collectionService.removeProductFromAllCollections(result._id.toString());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product archived successfully.',
    data: result,
  });
});

const restoreProduct: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const result = await service.restoreArchivedProductIntoDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product restored successfully.',
    data: result,
  });
});

const getPendingProducts: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const result = await service.getPendingProductsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending products retrieved successfully.',
    data: result,
  });
});

const approveProduct: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { id } = req.params;
  const result = await service.approveProductIntoInventory(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product approved successfully.',
    data: result,
  });
});

const getArchivedProductsForDashboard: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const result = await service.getArchivedProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Archived products retrieved successfully.',
    data: result,
  });
});

const deleteProductsPermanently: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { productIds } = req.body;

  const result = await service.deleteProductsPermanentlyFromDB(productIds);

  // Cleanup Collections for PERMANENT delete
  const collectionService = CollectionServices(req.dbConnection!, req.brand as TBrand);

  // Loop through the deleted IDs to clean up all collections
  await Promise.all(productIds.map((id: string) => collectionService.removeProductFromAllCollections(id)));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Archived products permanently deleted successfully.',
    data: result,
  });
});

const getRecentlyViewedProducts: RequestHandler = catchAsync(async (req, res) => {
  const service = ProductServices(req.dbConnection!, req.brand!);
  const { ids } = req.body;

  const result = await service.getRecentlyViewedProductsFromDB(ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recently viewed products retrieved successfully.',
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
  getPendingProducts,
  approveProduct,
  toggleStatus,
  getRelatedProducts,

  getArchivedProductsForDashboard,
  deleteProductsPermanently,
  getRecentlyViewedProducts,
};
