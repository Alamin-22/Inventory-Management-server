import httpStatus from 'http-status';
import { ICustomer } from './customer.interface';
import { AppError } from '@app/classes/AppError';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { Customer } from './customer.model';
import { generateUserId } from '../user/user.utils';

const createCustomer = async (payload: Partial<ICustomer>) => {
  // Generate a custom ID for the CRM (e.g., C-00001)
  payload.id = await generateUserId('customer');

  const result = await Customer.create(payload);
  return result;
};

const getAllCustomers = async (query: Record<string, unknown>) => {
  const customerQuery = new QueryBuilder(Customer, query)
    .search(['name', 'contactNo', 'email', 'id', 'companyName'])
    .filter()
    .sort()
    .paginate()
    .limitFields();

  const result = await customerQuery.exec();
  const meta = await customerQuery.getQueryMeta();

  return { meta, result };
};

const getSingleCustomer = async (id: string) => {
  const result = await Customer.findOne({ id });
  if (!result) throw new AppError('Customer not found', httpStatus.NOT_FOUND);
  return result;
};

const updateCustomer = async (id: string, payload: Partial<ICustomer>) => {
  const { billingAddress, shippingAddress, ...remainingData } = payload;
  const modifiedUpdatedData: Record<string, unknown> = { ...remainingData };

  if (billingAddress && Object.keys(billingAddress).length) {
    for (const [key, value] of Object.entries(billingAddress)) {
      modifiedUpdatedData[`billingAddress.${key}`] = value;
    }
  }

  if (shippingAddress && Object.keys(shippingAddress).length) {
    for (const [key, value] of Object.entries(shippingAddress)) {
      modifiedUpdatedData[`shippingAddress.${key}`] = value;
    }
  }

  const result = await Customer.findOneAndUpdate({ id }, modifiedUpdatedData, {
    new: true,
    runValidators: true,
  });

  if (!result) throw new AppError('Customer not found', httpStatus.NOT_FOUND);
  return result;
};

const deleteCustomer = async (id: string) => {
  const deletedCustomer = await Customer.findOneAndUpdate({ id }, { isDeleted: true }, { new: true });

  if (!deletedCustomer) throw new AppError('Failed to delete customer', httpStatus.BAD_REQUEST);
  return deletedCustomer;
};

export const CustomerServices = {
  createCustomer,
  getAllCustomers,
  getSingleCustomer,
  updateCustomer,
  deleteCustomer,
};
