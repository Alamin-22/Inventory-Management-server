import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { upload } from '@utils/sendMediaToCloudinary';
import express from 'express';
import { ProductControllers } from './product.controller';
import { USER_ROLE } from '../user/user.constants';
import { productValidationSchemas } from './product.validation';
import { parseDataJsonWithFiles } from './product.parseDataJsonWithFiles';
import { fileCleanupOnFinish } from '@app/middlewares/fileCleanupOnFinish';

const router = express.Router();

// -------------------- Public routes --------------------
router.get('/get_all', ProductControllers.getAllProducts);

router.post(
  '/recently_viewed',
  ValidateRequestMiddleWare(productValidationSchemas.recentlyViewedZodSchema),
  ProductControllers.getRecentlyViewedProducts,
);

// -------------------- Admin routes --------------------
router.post(
  '/create',
  upload.any(),
  fileCleanupOnFinish,
  parseDataJsonWithFiles,
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(productValidationSchemas.createProductZodSchema),
  ProductControllers.createProduct,
);

router.get(
  '/get_all_for_dashboard',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ProductControllers.getAllProductsForDashboard,
);

router.get(
  '/pending',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ProductControllers.getPendingProducts,
);

router.get(
  '/archived',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ProductControllers.getArchivedProductsForDashboard,
);

router.delete(
  '/permanent_delete',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(productValidationSchemas.permanentDeleteZodSchema),
  ProductControllers.deleteProductsPermanently,
);

router.patch(
  '/restore/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ProductControllers.restoreProduct,
);

router.delete(
  '/delete/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ProductControllers.deleteProduct,
);

router.post(
  '/approve/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(productValidationSchemas.approveProductZodSchema),
  ProductControllers.approveProduct,
);

router.patch(
  '/:id',
  upload.any(),
  fileCleanupOnFinish,
  parseDataJsonWithFiles,
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(productValidationSchemas.updateProductZodSchema),
  ProductControllers.updateProduct,
);

router.patch(
  '/:id/status',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ProductControllers.toggleStatus,
);
router.get('/:identifier/related', ProductControllers.getRelatedProducts);

router.get('/:identifier', ProductControllers.getSingleProduct);

export const ProductRoutes = router;
