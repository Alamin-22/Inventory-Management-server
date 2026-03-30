/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { Connection } from 'mongoose';
import { IAdmin } from './admin.interface';
import { AppError } from '@app/classes/AppError';

import { QueryBuilder } from '@app/classes/QueryBuilder';
import { UserSearchableFields } from '../user/user.constants';
import { getUserModel } from '../user/user.model';
import { getAdminModel } from './admin.model';

export const AdminServices = (connection: Connection) => {
  // 1. Define Models "Globally" for this request scope
  const UserModel = getUserModel(connection);
  const AdminModel = getAdminModel(connection);

  const getAllAdmins = async (query: Record<string, unknown>) => {
    const adminQuery = new QueryBuilder(AdminModel, query);

    adminQuery
      .search(UserSearchableFields)
      .filter()
      .sort()
      .paginate()
      .populate({
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        unwind: true,
      })
      .limitFields();

    const result = await adminQuery.exec();
    const meta = await adminQuery.getQueryMeta();

    return {
      meta,
      result,
    };
  };

  const getSingleAdmin = async (id: string) => {
    const result = await AdminModel.findOne({ id }).populate('user');
    if (!result) {
      throw new AppError('Admin not found', httpStatus.NOT_FOUND);
    }
    return result;
  };

  const updateAdmin = async (id: string, payload: Partial<IAdmin>) => {
    const { name, ...remainingData } = payload;

    const modifiedUpdatedData: Record<string, unknown> = {
      ...remainingData,
    };

    // Handle Nested Name Update Dynamically
    if (name && Object.keys(name).length) {
      for (const [key, value] of Object.entries(name)) {
        modifiedUpdatedData[`name.${key}`] = value;
      }
    }

    const result = await AdminModel.findOneAndUpdate({ id }, modifiedUpdatedData, {
      new: true,
      runValidators: true,
    });

    return result;
  };

  const deleteAdmin = async (id: string) => {
    const session = await connection.startSession();

    try {
      session.startTransaction();

      // 1. Delete Admin Profile
      const deletedAdmin = await AdminModel.findOneAndUpdate({ id }, { isDeleted: true }, { new: true, session });

      if (!deletedAdmin) {
        throw new AppError('Failed to delete admin', httpStatus.BAD_REQUEST);
      }

      // 2. Delete Associated User (Auth)
      const deletedUser = await UserModel.findOneAndUpdate({ id }, { isDeleted: true }, { new: true, session });

      if (!deletedUser) {
        throw new AppError('Failed to delete user', httpStatus.BAD_REQUEST);
      }

      await session.commitTransaction();
      await session.endSession();

      return deletedAdmin;
    } catch (err: any) {
      await session.abortTransaction();
      await session.endSession();
      throw new Error(err);
    }
  };

  return {
    getAllAdmins,
    getSingleAdmin,
    updateAdmin,
    deleteAdmin,
  };
};
