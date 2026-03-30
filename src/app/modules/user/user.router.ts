import express from 'express';
import { UserControllers } from './user.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from './user.constants';
import { UserValidation } from './user.validation';
import { AdminValidation } from '../admin/admin.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';

const router = express.Router();
const HIGH_LEVEL_STAFF = [USER_ROLE.admin, USER_ROLE.super_admin];

router.post(
  '/create-staff',
  AuthValidationMiddleWare(...HIGH_LEVEL_STAFF),
  ValidateRequestMiddleWare(AdminValidation.createAdminZodSchema),
  UserControllers.createStaffMember,
);

router.delete('/:id', AuthValidationMiddleWare(...HIGH_LEVEL_STAFF), UserControllers.deleteUser);

router.patch(
  '/change-status/:id',
  AuthValidationMiddleWare(...HIGH_LEVEL_STAFF),
  ValidateRequestMiddleWare(UserValidation.changeStatusValidationSchema),
  UserControllers.changeStatus,
);

export const UserRoutes = router;
