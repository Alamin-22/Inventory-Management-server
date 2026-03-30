import express from 'express';
import { CategoryControllers } from './Category.controller';
import { CategoryValidation } from './Category.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '@app/modules/user/user.constants';

const router = express.Router();

// Staff Roles mapping
const STAFF = [USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager];

// Create
router.post(
  '/',
  AuthValidationMiddleWare(...STAFF),
  ValidateRequestMiddleWare(CategoryValidation.createCategoryZodSchema),
  CategoryControllers.createCategory,
);

// Read All
router.get('/', AuthValidationMiddleWare(...STAFF), CategoryControllers.getAllCategories);

// Read Single
router.get('/:id', AuthValidationMiddleWare(...STAFF), CategoryControllers.getSingleCategory);

// Reorder (Must be placed before /:id to prevent route clashing)
router.patch(
  '/reorder',
  AuthValidationMiddleWare(...STAFF),
  ValidateRequestMiddleWare(CategoryValidation.reorderCategoryZodSchema),
  CategoryControllers.reOrderCategories,
);

// Update
router.patch(
  '/:id',
  AuthValidationMiddleWare(...STAFF),
  ValidateRequestMiddleWare(CategoryValidation.updateCategoryZodSchema),
  CategoryControllers.updateCategory,
);

// Delete
router.delete(
  '/:id',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin), // Only admins can delete
  CategoryControllers.deleteCategory,
);

export const CategoryRoutes = router;
