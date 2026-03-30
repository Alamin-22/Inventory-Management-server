import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import { config } from '@config/env';
import { catchAsync } from '@utils/catchAsync';
import sendResponse from '@utils/sendResponse';
import { AuthServices } from './auth.service';
import { NewsLetterService } from '../Promotions/NewsLetter/NewsLetter.service';
import { TBrand } from './auth.interface';

const isProduction = process.env.environment === 'production';

const loginUser: RequestHandler = catchAsync(async (req, res) => {
  const authService = AuthServices(req.dbConnection, req.brand);

  const result = await authService.loginUser(req.body);
  const { refreshToken, accessToken, user } = result;
  const cookieDomain = config.client[req.brand].domain;

  // Set Refresh Token in Cookie (HttpOnly)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction, // In production: true, In development: false
    sameSite: isProduction ? 'none' : 'lax', // In production: 'none', In development: 'lax'
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: isProduction ? cookieDomain : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully',
    data: {
      accessToken,
      user,
    },
  });
});

const socialLogin: RequestHandler = catchAsync(async (req, res) => {
  const authService = AuthServices(req.dbConnection, req.brand);
  const result = await authService.socialLogin(req.body);
  const { refreshToken, accessToken, user } = result;
  const cookieDomain = config.client[req.brand].domain;

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: isProduction ? cookieDomain : undefined,
  });

  // After successful user creation
  NewsLetterService(req.dbConnection!, req.brand as TBrand)
    .syncSubscriber({
      email: user.email,
      name: user.name,
      source: 'user-registration',
    })
    .catch((err) => console.error('Newsletter Sync Error (Registration):', err));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Social Login successful',
    data: {
      accessToken,
      user,
    },
  });
});

const refreshToken: RequestHandler = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  const authService = AuthServices(req.dbConnection, req.brand);
  const result = await authService.refreshToken(refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token retrieved successfully',
    data: result,
  });
});

const logout: RequestHandler = catchAsync(async (req, res) => {
  const cookieDomain = config.client[req.brand].domain;
  // Clear Cookies
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    domain: isProduction ? cookieDomain : undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const authService = AuthServices(req.dbConnection, req.brand);

  const result = await authService.changePassword(req.user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password changed successfully!',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const email = req.body.email;

  const authService = AuthServices(req.dbConnection, req.brand);

  const result = await authService.forgetPassword(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reset link sent to your email.',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const token = req.headers.authorization || '';

  const authService = AuthServices(req.dbConnection, req.brand);

  const result = await authService.resetPassword(req.body, token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password reset successfully!',
    data: result,
  });
});

const updateSuperAdminEmail: RequestHandler = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const service = AuthServices(req.dbConnection!, req.brand as TBrand);

  const result = await service.updateSuperAdminEmail(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Master Key: Super Admin email changed successfully.',
    data: result,
  });
});

export const AuthControllers = {
  loginUser,
  socialLogin,
  refreshToken,
  logout,
  changePassword,
  forgetPassword,
  resetPassword,
  updateSuperAdminEmail,
};
