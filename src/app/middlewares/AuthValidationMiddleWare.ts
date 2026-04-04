import { AppError } from '@app/classes/AppError';
import { TUserRole } from '@app/modules/user/user.interface';
import { User } from '@app/modules/user/user.model';
import { config } from '@config/env';
import { catchAsync } from '@utils/catchAsync';
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';

const AuthValidationMiddleWare = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    // console.log(requiredRoles);
    // checking if the token is missing
    if (!token) {
      throw new AppError('You are not authorized!', httpStatus.UNAUTHORIZED);
    }

    // checking if the given token is valid
    const decoded = jwt.verify(token, config.accessTokenSecret as string) as JwtPayload;

    const { role, email, iat } = decoded;

    // checking if the user is exist
    const user = await User.isUserExistByEmail(email);

    if (!user) {
      throw new AppError('This user is not found !', httpStatus.NOT_FOUND);
    }

    // checking if the user is already deleted

    const isDeleted = user?.isDeleted;

    if (isDeleted) {
      throw new AppError('This user is deleted !', httpStatus.FORBIDDEN);
    }

    // checking if the user is blocked
    const userStatus = user?.status;

    if (userStatus === 'blocked') {
      throw new AppError('This user is blocked !', httpStatus.FORBIDDEN);
    }

    if (user.passwordChangedAt && User.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)) {
      throw new AppError('You are not authorized !', httpStatus.UNAUTHORIZED);
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError('You are not authorized!', httpStatus.UNAUTHORIZED);
    }

    req.user = decoded as JwtPayload;

    // SILENT TRACKING: Update lastActive in the background
    User.updateOne({ email: email }, { lastActive: new Date() })
      .exec()
      .catch((err) => console.error('Failed to update lastActive for user:', email, err));

    next();
  });
};

export default AuthValidationMiddleWare;
