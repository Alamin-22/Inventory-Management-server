import express from 'express';
import { AdminControllers } from './admin.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';
import { AdminValidation } from './admin.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';

const router = express.Router();

const ALL_STAFF = [USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager];

/**
 * 1. PERMISSIONS MANIFEST
 */
router.get('/meta/permissions', AuthValidationMiddleWare(...ALL_STAFF), AdminControllers.getAdminPermissionsMeta);

/**
 * 2. GET SINGLE PROFILE
 * All staff members can view a profile (Managers can view their own/others,
 * depending on your frontend access).
 */
router.get('/:id', AuthValidationMiddleWare(...ALL_STAFF), AdminControllers.getSingleAdmin);

/**
 * 3. UPDATE STAFF PROFILE
 * We allow 'manager' here so they can update their own Name/Contact/Image.
 * * CRITICAL: The Backend Service Hierarchy Guard prevents:
 * - Managers from editing other people's profiles.
 * - Managers from changing their own Role.
 * - Managers from changing their own Permissions.
 */
router.patch(
  '/:id',
  AuthValidationMiddleWare(...ALL_STAFF),
  ValidateRequestMiddleWare(AdminValidation.updateAdminZodSchema),
  AdminControllers.updateStaff,
);

export const AdminRoutes = router;
