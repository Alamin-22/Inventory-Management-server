import express from 'express';
import { CustomerControllers } from './customer.controller';
import AuthValidationMiddleWare from '@app/middlewares/AuthValidationMiddleWare';
import { USER_ROLE } from '../user/user.constants';
import { CustomerValidation } from './customer.validation';
import ValidateRequestMiddleWare from '@app/middlewares/ValidateRequestMiddleWare';

const router = express.Router();

const STAFF_ROLES = [USER_ROLE.admin, USER_ROLE.super_admin, USER_ROLE.manager];

router.post(
  '/',
  AuthValidationMiddleWare(...STAFF_ROLES),
  ValidateRequestMiddleWare(CustomerValidation.createCustomerZodSchema),
  CustomerControllers.createCustomer,
);

router.get('/', AuthValidationMiddleWare(...STAFF_ROLES), CustomerControllers.getAllCustomers);

router.get('/:id', AuthValidationMiddleWare(...STAFF_ROLES), CustomerControllers.getSingleCustomer);

router.patch(
  '/:id',
  AuthValidationMiddleWare(...STAFF_ROLES),
  ValidateRequestMiddleWare(CustomerValidation.updateCustomerZodSchema),
  CustomerControllers.updateCustomer,
);

router.delete(
  '/:id',
  AuthValidationMiddleWare(USER_ROLE.admin, USER_ROLE.super_admin),
  CustomerControllers.deleteCustomer,
);

export const CustomerRoutes = router;
