import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { upload } from '@utils/sendMediaToCloudinary';
import express, { Request, Response, NextFunction } from 'express';
import { USER_ROLE } from '../user/user.constants';
import { brandValidationSchemas } from './Brand.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { BrandControllers } from './Brand.controller';
import { fileCleanupOnFinish } from '@app/middlewares/fileCleanupOnFinish';

const router = express.Router();

router.post(
  '/create',
  upload.single('file'),
  fileCleanupOnFinish,
  (req: Request, _res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    next();
  },
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(brandValidationSchemas.createBrandZodSchema),
  BrandControllers.createBrand,
);

router.get('/get_all', BrandControllers.getAllBrands);

router.get(
  '/get_all_for_dashboard',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  BrandControllers.getBrandsForDashboard,
);
router.get('/:id', BrandControllers.getSingleBrand);

router.patch(
  '/:id',
  upload.single('file'),
  fileCleanupOnFinish,
  (req: Request, _res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    next();
  },
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  ValidateRequestMiddleWare(brandValidationSchemas.updateBrandZodSchema),
  BrandControllers.updateBrand,
);

router.delete(
  '/delete/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  BrandControllers.deleteBrand,
);

export const BrandRoutes = router;
