import express from 'express';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import CheckAuthPermissionMiddleware from '@app/middlewares/CheckAuthPermissionMiddleware';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { upload } from '@utils/sendMediaToCloudinary';
import { ProductControllers } from './product.controller';
import { USER_ROLE } from '../user/user.constants';
import { AdminPermissions } from '@app/modules/admin/admin.constant';
import { productValidationSchemas } from './product.validation';
import { parseDataJsonWithFiles } from './product.parseDataJsonWithFiles';
import { fileCleanupOnFinish } from '@app/middlewares/fileCleanupOnFinish';

const router = express.Router();

// -------------------- POS / Staff Routes --------------------
// Cashiers and stock staff need to view active products to process orders
router.get(
  '/get_all',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  ProductControllers.getAllProducts,
);

router.get(
  '/:identifier',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ProductControllers.getSingleProduct,
);

// -------------------- Admin / Manager Routes --------------------
router.get(
  '/dashboard/get_all',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ProductControllers.getAllProductsForDashboard,
);

router.get(
  '/dashboard/archived',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ProductControllers.getArchivedProductsForDashboard,
);

router.post(
  '/create',
  upload.any(),
  fileCleanupOnFinish,
  parseDataJsonWithFiles,
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ValidateRequestMiddleWare(productValidationSchemas.createProductZodSchema),
  ProductControllers.createProduct,
);

router.patch(
  '/:id',
  upload.any(),
  fileCleanupOnFinish,
  parseDataJsonWithFiles,
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ValidateRequestMiddleWare(productValidationSchemas.updateProductZodSchema),
  ProductControllers.updateProduct,
);

router.patch(
  '/:id/status',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ProductControllers.toggleStatus,
);

router.delete(
  '/delete/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ProductControllers.deleteProduct,
);

router.patch(
  '/restore/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.manager, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ProductControllers.restoreProduct,
);

router.delete(
  '/permanent_delete',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ValidateRequestMiddleWare(productValidationSchemas.permanentDeleteZodSchema),
  ProductControllers.deleteProductsPermanently,
);

export const ProductRoutes = router;
