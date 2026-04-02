import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '@config/env';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@app/classes/AppError';
import { TUserRole } from '@app/modules/user/user.interface';
import { User } from '@app/modules/user/user.model';

const AuthValidationMiddleWare = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization;

    // checking if the token is missing
    if (!token) {
      throw new AppError('You are not authorized!', httpStatus.UNAUTHORIZED);
    }

    // checking if the given token is valid
    const decoded = jwt.verify(token, config.accessTokenSecret) as JwtPayload;
    const { role, email, iat } = decoded;

    // Use the standard globally imported User model
    const user = await User.isUserExistByEmail(email);

    if (!user) {
      throw new AppError('This user is not found!', httpStatus.NOT_FOUND);
    }

    if (user.isDeleted) {
      throw new AppError('This user is deleted!', httpStatus.FORBIDDEN);
    }

    if (user.status === 'blocked') {
      throw new AppError('This account is blocked!', httpStatus.FORBIDDEN);
    }

    if (user.passwordChangedAt && User.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)) {
      throw new AppError('You are not authorized! Token expired after password change.', httpStatus.UNAUTHORIZED);
    }

    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new AppError('You are not authorized to access this route!', httpStatus.UNAUTHORIZED);
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

export default AuthValidationMiddleWare;
