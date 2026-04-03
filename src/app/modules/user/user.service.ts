/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { AppError } from '@app/classes/AppError';
import { User } from './user.model';
import { Admin } from '../admin/admin.model';
import { USER_ROLE, USER_STATUS, UserSearchableFields } from './user.constants';
import { generateUserId } from './user.utils';
import { IAdmin } from '../admin/admin.interface';
import { AdminPermissions } from '../admin/admin.constant';
import type { JwtPayload } from 'jsonwebtoken';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import generateAvatar from '@utils/generateAvatar';

const createStaffMember = async (payload: { password?: string; admin: Partial<IAdmin> }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const customId = await generateUserId('admin');

    const userData = {
      id: customId,
      email: payload.admin.email,
      password: payload.password || 'defaultPassword123!',
      role: USER_ROLE.manager, // Default newly created staff to manager level
      status: USER_STATUS.active,
      isVerified: true,
    };

    const newUser = await User.create([userData], { session });
    if (!newUser.length) throw new AppError('Failed to create user auth record', httpStatus.BAD_REQUEST);

    payload.admin.id = customId;
    payload.admin.user = newUser[0]._id;

    payload.admin.profileImg = {
      url: generateAvatar(payload.admin.name || 'User'),
      publicId: '',
    };

    const newAdmin = await Admin.create([payload.admin], { session });
    if (!newAdmin.length) throw new AppError('Failed to create staff profile', httpStatus.BAD_REQUEST);

    await session.commitTransaction();
    return newAdmin[0];
  } catch (err: any) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
};

const getAllUsersFromDB = async (query: Record<string, unknown>) => {
  console.log('api called ');
  const userQuery = new QueryBuilder(User, query)
    .search(UserSearchableFields)
    .filter()
    .sort()
    .paginate()
    .populate({
      from: 'admins',
      localField: '_id',
      foreignField: 'user',
      as: 'adminProfile',
      unwind: true,

      pipeline: [
        {
          $project: {
            name: 1,
            email: 1,
            contactNo: 1,
            permissions: 1,
            profileImg: 1,
            _id: 0,
          },
        },
      ],
    })

    .select('id, email, role, status, isVerified, createdAt, lastActive, adminProfile');

  const result = await userQuery.exec();
  const meta = await userQuery.getQueryMeta();
  return { meta, result };
};

const getSingleUserFromDB = async (id: string) => {
  const result = await User.aggregate([
    { $match: { id, isDeleted: false } },
    {
      $lookup: {
        from: 'admins',
        localField: '_id',
        foreignField: 'user',
        as: 'adminProfile',
      },
    },
    { $unwind: { path: '$adminProfile', preserveNullAndEmptyArrays: true } },
  ]);

  if (!result || result.length === 0) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  return result[0];
};

const deleteUser = async (id: string, currentUser: JwtPayload) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const targetUser = await User.findOne({ id });
    if (!targetUser) throw new AppError('User not found', httpStatus.NOT_FOUND);

    if (targetUser.role === USER_ROLE.super_admin) {
      throw new AppError('Forbidden: Cannot delete Super Admin', httpStatus.FORBIDDEN);
    }

    if (currentUser.role !== USER_ROLE.super_admin) {
      const userPermissions = currentUser.permissions || [];
      const hasFullAccess = userPermissions.includes(AdminPermissions.FULL_ACCESS);

      if (!hasFullAccess && targetUser.role === USER_ROLE.admin) {
        throw new AppError('Forbidden: Only Full Access admins can remove other admins.', httpStatus.FORBIDDEN);
      }
    }

    await Admin.findOneAndUpdate({ id }, { isDeleted: true }, { session });

    const deletedUser = await User.findOneAndUpdate({ id }, { isDeleted: true }, { new: true, session });
    if (!deletedUser) throw new AppError('Failed to delete user', httpStatus.BAD_REQUEST);

    await session.commitTransaction();
    return deletedUser;
  } catch (err: any) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
};

const changeUserStatus = async (id: string, payload: { status: string }) => {
  const result = await User.findOneAndUpdate({ id }, payload, { new: true });
  if (!result) throw new AppError('User not found', httpStatus.NOT_FOUND);
  return result;
};

export const UserServices = {
  createStaffMember,
  deleteUser,
  changeUserStatus,
  getAllUsersFromDB,
  getSingleUserFromDB,
};
