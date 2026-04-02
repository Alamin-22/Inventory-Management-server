import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { AppError } from '@app/classes/AppError';
import { catchAsync } from '@utils/catchAsync';
import { USER_ROLE } from '@app/modules/user/user.constants';
import { AdminPermissions, TAdminPermission } from '@app/modules/admin/admin.constant';

/**
 * Validates specific admin permissions stored in the JWT payload.
 * Must be used AFTER AuthValidationMiddleWare.
 */
const CheckAuthPermissionMiddleware = (requiredPermission: TAdminPermission) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new AppError('Authentication context missing.', httpStatus.UNAUTHORIZED);
    }

    const { role, permissions } = user;

    // 1. Super Admin Bypass (Absolute Authority)
    if (role === USER_ROLE.super_admin) {
      return next();
    }

    // 2. Role Check: Only Admin and Manager roles should have granular permissions
    if (role !== USER_ROLE.admin && role !== USER_ROLE.manager) {
      throw new AppError('Access Denied. Reserved for authorized staff.', httpStatus.FORBIDDEN);
    }

    // 3. Permission Validation
    const hasPermission = permissions?.includes(requiredPermission);
    const hasFullAccess = permissions?.includes(AdminPermissions.FULL_ACCESS);

    if (!hasPermission && !hasFullAccess) {
      throw new AppError(
        `Permission Denied: You require '${requiredPermission}' to perform this action.`,
        httpStatus.FORBIDDEN,
      );
    }

    next();
  });
};

export default CheckAuthPermissionMiddleware;
