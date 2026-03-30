import express from 'express';
import { CustomerControllers } from './customer.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';
import { CustomerValidation } from './customer.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';

const router = express.Router();

router.get('/', AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin), CustomerControllers.getAllCustomers);

router.get(
  '/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin, USER_ROLE.customer),
  CustomerControllers.getSingleCustomer,
);

router.patch(
  '/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin, USER_ROLE.customer),
  ValidateRequestMiddleWare(CustomerValidation.updateCustomerZodSchema),
  CustomerControllers.updateCustomer,
);

router.delete(
  '/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  CustomerControllers.deleteCustomer,
);

export const CustomerRoutes = router;
