import { Router } from 'express';
import { AnalyticsControllers } from './Analytics.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import CheckAuthPermissionMiddleware from '@app/middlewares/CheckAuthPermissionMiddleware';
import { USER_ROLE } from '../user/user.constants';
import { AdminPermissions } from '../admin/admin.constant';

const router = Router();

router.get(
  '/dashboard-summary',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager),
  CheckAuthPermissionMiddleware(AdminPermissions.VIEW_ANALYTICS),
  AnalyticsControllers.getDashboardSummary,
);

router.get(
  '/restock-queue',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager),
  CheckAuthPermissionMiddleware(AdminPermissions.MANAGE_STOCK),
  AnalyticsControllers.getRestockQueue,
);

export const AnalyticsRoutes = router;
