import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';
import { upload } from '@utils/sendMediaToCloudinary';
import express from 'express';
import { UserValidation } from './user.validation';
import { UserControllers } from './user.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from './user.constants';
import { fileCleanupOnFinish } from '@app/middlewares/fileCleanupOnFinish';

const router = express.Router();

// 1. Account Creation (Highest Specificity)
router.post(
  '/create-customer',
  upload.single('file'),
  fileCleanupOnFinish,
  (req, _res, next) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  ValidateRequestMiddleWare(UserValidation.createCustomerValidationSchema),
  UserControllers.createCustomer,
);

router.post(
  '/create-admin',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin),
  upload.single('file'),
  fileCleanupOnFinish,
  (req, _res, next) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  ValidateRequestMiddleWare(UserValidation.createAdminValidationSchema),
  UserControllers.createAdmin,
);

// 2. Self-Service Profile Routes 
router.get(
  '/me',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.customer),
  UserControllers.getMe,
);

router.patch(
  '/update-admin-profile',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.editor),
  upload.single('file'),
  fileCleanupOnFinish,
  (req, _res, next) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  UserControllers.updateAdminProfile,
);

router.patch(
  '/update-customer-profile',
  AuthValidationMiddleWare(USER_ROLE.customer),
  upload.single('file'),
  fileCleanupOnFinish,
  (req, _res, next) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  UserControllers.updateCustomerProfile,
);

// 3. Administrative Management (Global Actions)
router.get('/', AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin), UserControllers.getAllUsers);

//  User Management
router.patch(
  '/change-status/:id',
  AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin),
  ValidateRequestMiddleWare(UserValidation.changeStatusValidationSchema),
  UserControllers.changeStatus,
);

// 4. Parameterized Routes (Catch-all / Must be at the bottom)
router.get('/:id', AuthValidationMiddleWare(USER_ROLE.super_admin, USER_ROLE.admin), UserControllers.getSingleUser);

router.delete('/delete/:id', AuthValidationMiddleWare(USER_ROLE.super_admin), UserControllers.deleteUser);

export const UserRoutes = router;
