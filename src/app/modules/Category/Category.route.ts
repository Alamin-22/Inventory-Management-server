import express, { NextFunction, Request, Response } from 'express';
import { CategoryControllers } from './Category.controller';
import { categoryValidationSchemas } from './Category.validation';
import { upload } from '@utils/sendMediaToCloudinary';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '@app/modules/user/user.constants';
import { fileCleanupOnFinish } from '@app/middlewares/fileCleanupOnFinish';

const router = express.Router();

// api/v1/category/create => to create category
router.post(
  '/create',
  upload.single('file'),
  fileCleanupOnFinish,
  // function to handle image upload
  (req: Request, _res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    next();
  },
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(categoryValidationSchemas.createCategoryZodSchema),
  CategoryControllers.createCategory,
);

router.patch(
  '/reorder',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(categoryValidationSchemas.reorderCategoryZodSchema),
  CategoryControllers.reOrderCategories,
);

// api/vi/categories to get all categories
router.get('/', CategoryControllers.getAllCategories);

// to delete category
router.delete(
  '/delete/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  CategoryControllers.deleteCategory,
);

router.get('/:id', CategoryControllers.getSingleCategory);

// update
router.patch(
  '/:id',
  upload.single('file'),
  fileCleanupOnFinish,
  (req: Request, _res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    next();
  },
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(categoryValidationSchemas.updateCategoryZodSchema),
  CategoryControllers.updateCategory,
);

export const CategoryRoutes = router;
