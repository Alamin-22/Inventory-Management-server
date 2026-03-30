import express from 'express';
import { CategoryControllers } from './Category.controller';
import { CategoryValidation } from './Category.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import CheckAuthPermissionMiddleware from '@app/middlewares/CheckAuthPermissionMiddleware';
import { USER_ROLE } from '@app/modules/user/user.constants';
import { AdminPermissions } from '@app/modules/admin/admin.constant';

const router = express.Router();

// Staff Roles mapping
const STAFF = [USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager];

// Create (Requires Inventory Permission)
router.post(
  '/',
  AuthValidationMiddleWare(...STAFF),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ValidateRequestMiddleWare(CategoryValidation.createCategoryZodSchema),
  CategoryControllers.createCategory,
);

// Read All (Open to all authenticated staff)
router.get('/', AuthValidationMiddleWare(...STAFF), CategoryControllers.getAllCategories);

// Read Single (Open to all authenticated staff)
router.get('/:id', AuthValidationMiddleWare(...STAFF), CategoryControllers.getSingleCategory);

// Reorder (Requires Inventory Permission)
router.patch(
  '/reorder',
  AuthValidationMiddleWare(...STAFF),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ValidateRequestMiddleWare(CategoryValidation.reorderCategoryZodSchema),
  CategoryControllers.reOrderCategories,
);

// Update (Requires Inventory Permission)
router.patch(
  '/:id',
  AuthValidationMiddleWare(...STAFF),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  ValidateRequestMiddleWare(CategoryValidation.updateCategoryZodSchema),
  CategoryControllers.updateCategory,
);

// Delete (Requires Admin/Super Admin AND Inventory Permission)
router.delete(
  '/:id',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_INVENTORY),
  CategoryControllers.deleteCategory,
);

export const CategoryRoutes = router;
