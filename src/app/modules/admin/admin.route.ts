import express from 'express';
import { AdminControllers } from './admin.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';
import { AdminValidation } from './admin.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';

const router = express.Router();
const HIGH_LEVEL_STAFF = [USER_ROLE.admin, USER_ROLE.super_admin];

router.get(
  '/meta/permissions',
  AuthValidationMiddleWare(...HIGH_LEVEL_STAFF),
  AdminControllers.getAdminPermissionsMeta,
);

router.get('/', AuthValidationMiddleWare(...HIGH_LEVEL_STAFF), AdminControllers.getAllAdmins);

router.get('/:id', AuthValidationMiddleWare(...HIGH_LEVEL_STAFF, USER_ROLE.manager), AdminControllers.getSingleAdmin);

router.patch(
  '/:id',
  AuthValidationMiddleWare(...HIGH_LEVEL_STAFF),
  ValidateRequestMiddleWare(AdminValidation.updateAdminZodSchema),
  AdminControllers.updateAdmin,
);

export const AdminRoutes = router;
