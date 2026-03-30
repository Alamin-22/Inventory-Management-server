import express from 'express';
import { AuthControllers } from './auth.controller';
import { upload } from '@utils/sendMediaToCloudinary';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { loginValidationSchema } from './auth.validation';

const router = express.Router();

// --- Public Routes ---
router.post('/login/local', upload.none(), ValidateRequestMiddleWare(loginValidationSchema), AuthControllers.loginUser);

router.post('/login/social', AuthControllers.socialLogin);

router.post('/refresh-token', AuthControllers.refreshToken);
router.post('/forget-password', AuthControllers.forgetPassword);
router.post('/reset-password', AuthControllers.resetPassword);

// --- Protected Security Routes ---

// 🛡️ MASTER KEY: Only Super Admin can change their own email (Owner Handover)
router.patch(
  '/secure/master-email-change',
  AuthValidationMiddleWare(USER_ROLE.super_admin),
  // ValidateRequestMiddleWare(AuthValidation.masterEmailChangeSchema),
  AuthControllers.updateSuperAdminEmail,
);

router.post(
  '/change-password',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.customer, USER_ROLE.editor),
  AuthControllers.changePassword,
);

router.post('/logout', AuthControllers.logout);

export const AuthRoutes = router;
