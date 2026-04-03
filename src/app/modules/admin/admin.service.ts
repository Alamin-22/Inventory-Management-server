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

    // 1. Fetch Target User
    const targetUser = await User.findOne({ id });
    if (!targetUser) {
      throw new AppError('Staff record not found', httpStatus.NOT_FOUND);
    }

    /**
     * BOSS GUARD: Super Admin Protection
     * Only the Super Admin can modify their own account.
     */
    if (targetUser.role === USER_ROLE.super_admin) {
      if (currentUser.id !== targetUser.id) {
        throw new AppError('Forbidden: Only the Super Admin can modify this account.', httpStatus.FORBIDDEN);
      }
    }

    /**
     * HIERARCHY GUARD: Manager Restrictions
     * Per requirement: Managers CAN manage permissions, but NOT roles.
     */
    if (currentUser.role === USER_ROLE.manager) {
      // BLOCK: Role changes (Promotion/Demotion of system level)
      if (role && role !== targetUser.role) {
        throw new AppError('Forbidden: Managers are not authorized to modify system roles.', httpStatus.FORBIDDEN);
      }

      // NOTE: admin.permissions is now ALLOWED for Managers here.
    }

    // 2. Handle Admin Profile Updates (Profile Collection)
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

      // Managers can update permission
      if (permissions) adminUpdateData.permissions = permissions;

      const updatedAdmin = await Admin.findOneAndUpdate({ id }, adminUpdateData, {
        new: true,
        runValidators: true,
        session,
      });

      if (!updatedAdmin) {
        throw new AppError('Staff profile not found', httpStatus.NOT_FOUND);
      }
    }

    // 3. Handle User Auth Updates (Auth Collection)
    if (role || password) {
      const userUpdateData: Record<string, unknown> = {};

      // Role is only updated if it passed the Hierarchy Guard above
      if (role) userUpdateData.role = role;

      if (password) {
        userUpdateData.password = password;
        userUpdateData.needsPasswordChange = true;
        userUpdateData.passwordChangedAt = new Date();
      }

      const updatedUser = await User.findOneAndUpdate({ id }, userUpdateData, {
        new: true,
        runValidators: true,
        session,
      });

      if (!updatedUser) {
        throw new AppError('User auth record not found', httpStatus.NOT_FOUND);
      }
    }

    await session.commitTransaction();

    return await Admin.findOne({ id }).populate('user');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
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
