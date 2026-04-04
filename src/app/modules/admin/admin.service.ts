import httpStatus from 'http-status';
import { TUpdateStaffPayload } from './admin.interface';
import { AppError } from '@app/classes/AppError';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { Admin } from './admin.model';
import { AdminSearchableFields } from './admin.constant';
import { User } from '../user/user.model';
import generateAvatar from '@utils/generateAvatar';
import mongoose from 'mongoose';
import { USER_ROLE } from '../user/user.constants';
import { JwtPayload } from 'jsonwebtoken';

const getAllAdmins = async (query: Record<string, unknown>) => {
  const adminQuery = new QueryBuilder(Admin, query)
    .search(AdminSearchableFields)
    .filter()
    .sort()
    .paginate()
    .populate({
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'authDetails',
      unwind: true,
    })
    .limitFields();

  const result = await adminQuery.exec();
  const meta = await adminQuery.getQueryMeta();

  return { meta, result };
};

const getSingleAdmin = async (id: string) => {
  const result = await Admin.findOne({ id }).populate('user');
  if (!result) throw new AppError('Staff member not found', httpStatus.NOT_FOUND);
  return result;
};

const updateAdmin = async (id: string, payload: TUpdateStaffPayload, currentUser: JwtPayload) => {
  const { admin, role, password } = payload;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Fetch Target User (using the Custom ID from params)
    const targetUser = await User.findOne({ id });
    if (!targetUser) {
      throw new AppError('Staff record not found', httpStatus.NOT_FOUND);
    }

    /**
     * SELF-LOCKOUT PROTECTION (IDENTICAL ID TYPE FIX)
     * currentUser.id is the MongoDB _id from the token.
     * targetUser._id is the MongoDB _id from the database.
     */
    const isSelfUpdate = currentUser.id === targetUser._id.toString();

    if (isSelfUpdate) {
      // Prevent changing own role
      if (role && role !== targetUser.role) {
        throw new AppError(
          'Security Violation: You cannot change your own system role. Demoting yourself would lock you out of this dashboard.',
          httpStatus.FORBIDDEN,
        );
      }

      // Prevent changing own permissions
      if (admin?.permissions) {
        throw new AppError(
          'Security Violation: You cannot modify your own permissions. This protection is active to prevent accidental account lockout.',
          httpStatus.FORBIDDEN,
        );
      }
    }

    /**
     * BOSS GUARD: Super Admin Protection
     * Ensures only the Super Admin can touch the Super Admin account.
     */
    if (targetUser.role === USER_ROLE.super_admin) {
      if (!isSelfUpdate) {
        throw new AppError(
          'Access Denied: The Master Account (Super Admin) can only be modified by the owner themselves.',
          httpStatus.FORBIDDEN,
        );
      }
    }

    /**
     * HIERARCHY GUARD: Manager Restrictions
     * Managers cannot change roles of others.
     */
    if (currentUser.role === USER_ROLE.manager && !isSelfUpdate) {
      if (role && role !== targetUser.role) {
        throw new AppError(
          'Access Denied: Managers are not authorized to modify system roles of other personnel.',
          httpStatus.FORBIDDEN,
        );
      }
    }

    // 2. Handle Admin Profile Updates
    if (admin && Object.keys(admin).length > 0) {
      const { name, contactNo, profileImg, permissions } = admin;
      const adminUpdateData: Record<string, unknown> = {};

      if (name) {
        adminUpdateData.name = name;
        if (!profileImg?.url) {
          adminUpdateData['profileImg.url'] = generateAvatar(name);
        }
      }
      if (contactNo) adminUpdateData.contactNo = contactNo;
      if (profileImg) adminUpdateData.profileImg = profileImg;

      // Logic Fix: Only allow permissions update if it's NOT a self-update
      if (permissions && !isSelfUpdate) {
        adminUpdateData.permissions = permissions;
      }

      const updatedAdmin = await Admin.findOneAndUpdate({ id }, adminUpdateData, {
        new: true,
        runValidators: true,
        session,
      });

      if (!updatedAdmin) {
        throw new AppError('Staff profile not found', httpStatus.NOT_FOUND);
      }
    }

    // 3. Handle User Auth Updates
    if (role || password) {
      const userUpdateData: Record<string, unknown> = {};

      if (role && !isSelfUpdate) userUpdateData.role = role;

      if (password) {
        userUpdateData.password = password;
        userUpdateData.needsPasswordChange = true;
        userUpdateData.passwordChangedAt = new Date();
      }

      if (Object.keys(userUpdateData).length > 0) {
        const updatedUser = await User.findOneAndUpdate({ id }, userUpdateData, {
          new: true,
          runValidators: true,
          session,
        });

        if (!updatedUser) {
          throw new AppError('User auth record not found', httpStatus.NOT_FOUND);
        }
      }
    }

    await session.commitTransaction();
    return await Admin.findOne({ id }).populate('user');
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
};

export const AdminServices = {
  getAllAdmins,
  getSingleAdmin,
  updateAdmin,
};
