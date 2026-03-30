/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { ICustomer } from './customer.interface';
import { Connection } from 'mongoose';
import { UserSearchableFields } from '../user/user.constants';
import { AppError } from '@app/classes/AppError';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { getCustomerModel } from './customer.model';
import { getUserModel } from '../user/user.model';

export const CustomerServices = (connection: Connection) => {
  // 1. Define Models "Globally" for this request scope
  const UserModel = getUserModel(connection);
  const CustomerModel = getCustomerModel(connection);

  const getAllCustomers = async (query: Record<string, unknown>) => {
    const customerQuery = new QueryBuilder(CustomerModel, query);

    customerQuery
      .search(UserSearchableFields)
      .filter()
      .sort()
      .paginate()

      .populate({
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        unwind: true, // Converts [userObject] -> userObject
      })
      .limitFields(); // Project fields last to ensure we don't drop the 'user' field before populating

    const result = await customerQuery.exec();
    const meta = await customerQuery.getQueryMeta();

    return {
      meta,
      result,
    };
  };
  const getSingleCustomer = async (id: string) => {
    const result = await CustomerModel.findOne({ id }).populate('user');
    if (!result) {
      throw new AppError('Customer not found', httpStatus.NOT_FOUND);
    }
    return result;
  };

  const updateCustomer = async (id: string, payload: Partial<ICustomer>) => {
    const { name, billingAddress, shippingAddress, ...remainingData } = payload;

    const modifiedUpdatedData: Record<string, unknown> = {
      ...remainingData,
    };

    // 1. Handle Nested Name Update Dynamically
    if (name && Object.keys(name).length) {
      for (const [key, value] of Object.entries(name)) {
        modifiedUpdatedData[`name.${key}`] = value;
      }
    }

    // 2. Handle Nested Billing Address
    if (billingAddress && Object.keys(billingAddress).length) {
      for (const [key, value] of Object.entries(billingAddress)) {
        modifiedUpdatedData[`billingAddress.${key}`] = value;
      }
    }

    // 3. Handle Nested Shipping Address
    if (shippingAddress && Object.keys(shippingAddress).length) {
      for (const [key, value] of Object.entries(shippingAddress)) {
        modifiedUpdatedData[`shippingAddress.${key}`] = value;
      }
    }

    const result = await CustomerModel.findOneAndUpdate({ id }, modifiedUpdatedData, {
      new: true,
      runValidators: true,
    });

    return result;
  };

  const deleteCustomer = async (id: string) => {
    const session = await connection.startSession();

    try {
      session.startTransaction();

      // 1. Delete Customer Profile
      const deletedCustomer = await CustomerModel.findOneAndUpdate({ id }, { isDeleted: true }, { new: true, session });

      if (!deletedCustomer) {
        throw new AppError('Failed to delete customer', httpStatus.BAD_REQUEST);
      }

      // 2. Delete Associated User (Auth)
      const deletedUser = await UserModel.findOneAndUpdate({ id }, { isDeleted: true }, { new: true, session });

      if (!deletedUser) {
        throw new AppError('Failed to delete user', httpStatus.BAD_REQUEST);
      }

      await session.commitTransaction();
      await session.endSession();

      return deletedCustomer;
    } catch (err: any) {
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  };

  return {
    getAllCustomers,
    getSingleCustomer,
    updateCustomer,
    deleteCustomer,
  };
};
