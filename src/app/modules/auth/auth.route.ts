import express from 'express';
import { AuthControllers } from './auth.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { AuthValidation } from './auth.validation';

const router = express.Router();

// --- Public Routes ---
router.post('/login', ValidateRequestMiddleWare(AuthValidation.loginValidationSchema), AuthControllers.loginUser);

router.get(
  '/get-me',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager),
  AuthControllers.getMe,
);

router.post('/refresh-token', AuthControllers.refreshToken);

router.post(
  '/forget-password',
  ValidateRequestMiddleWare(AuthValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
);

router.post(
  '/reset-password',
  ValidateRequestMiddleWare(AuthValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);

// --- Protected Security Routes ---

// 🛡️ MASTER KEY: Only Super Admin can change their own email (Owner Handover)
router.patch(
  '/secure/master-email-change',
  AuthValidationMiddleWare(USER_ROLE.super_admin),
  ValidateRequestMiddleWare(AuthValidation.updateSuperAdminEmailSchema),
  AuthControllers.updateSuperAdminEmail,
);

router.post(
  '/change-password',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager),
  ValidateRequestMiddleWare(AuthValidation.changePasswordValidationSchema),
  AuthControllers.changePassword,
);

router.post('/logout', AuthControllers.logout);

export const AuthRoutes = router;
