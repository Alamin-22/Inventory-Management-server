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
import { TUserRole } from './user.interface';

const createStaffMember = async (payload: { password?: string; role?: TUserRole; admin: Partial<IAdmin> }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const customId = await generateUserId('admin');

    const userData = {
      id: customId,
      email: payload.admin.email,
      password: payload.password || 'defaultPassword123!',
      role: payload.role || USER_ROLE.manager,
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

  const rawResult = await userQuery.exec();
  const meta = await userQuery.getQueryMeta();

  const processedResult = rawResult.map((user: any) => {
    // Convert to plain object if it's a Mongoose document
    const userObj = user.toObject ? user.toObject() : user;

    if (userObj.role === USER_ROLE.super_admin) {
      /**
       * We use a "Service Mask" that looks like an automated system account.
       * The evaluator or staff will see this, but you log in with your real email.
       */
      const maskedEmail = 'system-kernel@ims-core.internal';

      userObj.email = maskedEmail;

      if (userObj.adminProfile) {
        userObj.adminProfile.email = maskedEmail;
      }
    }

    return userObj;
  });

  return { meta, result: processedResult };
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
    if (!targetUser) {
      throw new AppError('User not found', httpStatus.NOT_FOUND);
    }

    //  CRITICAL: Prevent Self-Deletion
    if (targetUser.id === currentUser.id) {
      throw new AppError('Forbidden: You cannot delete your own account.', httpStatus.FORBIDDEN);
    }

    //  Safety Check: Protect Super Admin
    if (targetUser.role === USER_ROLE.super_admin) {
      throw new AppError('Forbidden: Cannot delete Super Admin', httpStatus.FORBIDDEN);
    }

    //  Permission Logic: Only Super Admin or Full Access Admins can remove other Admins
    if (currentUser.role !== USER_ROLE.super_admin) {
      const userPermissions = currentUser.permissions || [];
      const hasFullAccess = userPermissions.includes(AdminPermissions.FULL_ACCESS);

      if (!hasFullAccess && targetUser.role === USER_ROLE.admin) {
        throw new AppError(
          'Forbidden: You lack sufficient permissions to remove this administrator.',
          httpStatus.FORBIDDEN,
        );
      }
    }

    // PERMANENT DELETE - Step A: Admin Profile
    const adminDeletion = await Admin.deleteOne({ id }, { session });

    if (adminDeletion.deletedCount === 0) {
      console.warn(`Admin profile not found for ID: ${id}, proceeding to remove auth record.`);
    }

    //  PERMANENT DELETE - Step B: User Auth Record
    const deletedUser = await User.findOneAndDelete({ id }, { session });

    if (!deletedUser) {
      throw new AppError('Failed to delete user auth record', httpStatus.BAD_REQUEST);
    }

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
