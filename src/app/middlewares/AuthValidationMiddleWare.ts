import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '@config/env';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@app/classes/AppError';
import { TUserRole } from '@app/modules/user/user.interface';
import { getUserModel } from '@app/modules/user/user.model';

const AuthValidationMiddleWare = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    console.log(requiredRoles);
    // checking if the token is missing
    if (!token) {
      throw new AppError('You are not authorized!', httpStatus.UNAUTHORIZED);
    }

    // checking if the given token is valid
    const decoded = jwt.verify(token, config.accessTokenSecret as string) as JwtPayload;

    const { role, email, iat } = decoded;

    //  Get the Model using the Request's Connection
    const UserModel = getUserModel(req.dbConnection);

    // checking if the user is exist
    const user = await UserModel.isUserExistByEmail(email);

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
      throw new AppError('This user is blocked ! !', httpStatus.FORBIDDEN);
    }

    if (user.passwordChangedAt && UserModel.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)) {
      throw new AppError('You are not authorized !', httpStatus.UNAUTHORIZED);
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new AppError('You are not authorized  hi!', httpStatus.UNAUTHORIZED);
    }

    req.user = decoded as JwtPayload;
    next();
  });
};

export default AuthValidationMiddleWare;
