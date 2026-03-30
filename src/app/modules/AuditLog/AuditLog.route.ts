import express from 'express';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import CheckAuthPermissionMiddleware from '@app/middlewares/CheckAuthPermissionMiddleware';
import { USER_ROLE } from '../user/user.constants';
import { AdminPermissions } from '../admin/admin.constants';
import { AuditLogControllers } from './AuditLog.controller';

const router = express.Router();

// Only Super Admins or Admins with Full Access can see the audit history
router.get(
  '/',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin),
  CheckAuthPermissionMiddleware(AdminPermissions.FULL_ACCESS),
  AuditLogControllers.getAllLogs,
);

export const AuditLogRoutes = router;
