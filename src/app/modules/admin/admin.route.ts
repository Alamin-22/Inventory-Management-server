import express from 'express';
import { AdminControllers } from './admin.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { AdminValidation } from './admin.validation';
import { USER_ROLE } from '../user/user.constants';

const router = express.Router();

router.get('/', AuthValidationMiddleWare(USER_ROLE.super_admin), AdminControllers.getAllAdmins);
router.get('/permissions', AuthValidationMiddleWare(USER_ROLE.super_admin), AdminControllers.getPermissionMetadata);

router.get('/:id', AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin), AdminControllers.getSingleAdmin);

router.patch(
  '/:id',
  AuthValidationMiddleWare(USER_ROLE.super_admin),
  ValidateRequestMiddleWare(AdminValidation.updateAdminZodSchema),
  AdminControllers.updateAdmin,
);

router.delete('/:id', AuthValidationMiddleWare(USER_ROLE.super_admin), AdminControllers.deleteAdmin);

export const AdminRoutes = router;
