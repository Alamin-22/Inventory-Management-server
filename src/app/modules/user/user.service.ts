/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientSession, Connection } from 'mongoose';
import httpStatus from 'http-status';
import { TAdminPayload, TCustomerPayload, TUser } from './user.interface';
import { generateUserId } from './user.utils';
import { USER_ROLE, USER_STATUS, UserSearchableFields } from './user.constants';
import { AppError } from '@app/classes/AppError';
import { purgeCloudinaryImages } from '@utils/sendMediaToCloudinary';
import { getCustomerModel } from '../customer/customer.model';
import { getAdminModel } from '../admin/admin.model';
import { getUserModel } from './user.model';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { sendEmail } from '@utils/sendEmail';
import { generateVerificationLink } from '../auth/auth.utils';
import { verificationEmailTemplate } from '@app/Email_Templates/Authentication-Related/verificationEmail.template';
import generateAvatar from '@utils/generateAvatar';
import { AdminPermissions } from '../admin/admin.constants';
import type { JwtPayload } from 'jsonwebtoken';
import { TBrand } from '../auth/auth.interface';
import { getBrandConfig } from '../Order/Order.email';
import { addFileToQueue, uploadUniqueFiles } from '../products/product.utils';
import { ICustomer } from '../customer/customer.interface';
import { IAdmin } from '../admin/admin.interface';

export const UserServices = (connection: Connection, storePreference: TBrand) => {
  // 1. Define Models "Globally" for this request scope
  const UserModel = getUserModel(connection);
  const CustomerModel = getCustomerModel(connection);
  const AdminModel = getAdminModel(connection);
  const { companyName, companyLogoUrl, supportEmail, supportPhone, clientUrl, themeColor } =
    getBrandConfig(storePreference);

  const folderPathForCustomer = `Profiles/Customers`;
  const folderPathForAdmin = `Profiles/Admins`;

  const createCustomerIntoDB = async (file: any, payload: TCustomerPayload) => {
    const userData: Partial<TUser> = {};
    const uploadQueue = new Map();
    let uploadedImage: { url: string; publicId: string } | undefined;

    // 1. Generate Custom ID
    userData.id = await generateUserId('customer', connection);

    // 2. Auth Data Setup
    userData.password = payload.password;
    userData.role = USER_ROLE.customer;
    userData.email = payload.customer.email;
    userData.status = USER_STATUS.active;
    userData.isVerified = false;
    userData.storePreference = storePreference;

    const session: ClientSession = await connection.startSession();

    try {
      session.startTransaction();

      if (file) {
        const fileKey = addFileToQueue(file, uploadQueue);

        // Use the utility to handle brand casing, suffix, and naming
        const urlMap = await uploadUniqueFiles(storePreference, userData.id!, uploadQueue, folderPathForCustomer);

        uploadedImage = urlMap.get(fileKey!);
        payload.customer.profileImg = uploadedImage;
      } else {
        // Fallback to generated avatar
        payload.customer.profileImg = {
          url: generateAvatar(payload.customer.name),
          publicId: '',
        };
      }

      const newUser = await UserModel.create([userData], { session });
      if (!newUser.length) throw new AppError('Failed to create user', httpStatus.BAD_REQUEST);

      //  Create Customer Profile Record
      payload.customer.id = newUser[0].id;
      payload.customer.user = newUser[0]._id;
      payload.customer.storePreference = storePreference;

      const newCustomer = await CustomerModel.create([payload.customer], { session });
      if (!newCustomer.length) throw new AppError('Failed to create customer profile', httpStatus.BAD_REQUEST);

      const verifyLink = generateVerificationLink(newUser[0]._id.toString(), newUser[0].email, storePreference);

      const emailBody = verificationEmailTemplate(
        payload.customer.name,
        verifyLink,
        companyName,
        companyLogoUrl,
        supportEmail,
        supportPhone,
        clientUrl,
        themeColor,
      );

      await sendEmail(newUser[0].email, `Verify Your Email - ${companyName}`, emailBody, storePreference);

      await session.commitTransaction();
      return newCustomer[0];
    } catch (err: any) {
      await session.abortTransaction();

      // Auto-Cleanup Ghost Assets
      if (uploadedImage?.publicId) {
        await purgeCloudinaryImages([{ publicId: uploadedImage.publicId }]);
      }

      throw err;
    } finally {
      await session.endSession();
    }
  };

  const createAdminIntoDB = async (file: any, payload: TAdminPayload) => {
    const userData: Partial<TUser> = {};
    const uploadQueue = new Map();
    let uploadedImage: { url: string; publicId: string } | undefined;

    // 1. Generate Custom ID
    userData.id = await generateUserId('admin', connection);

    userData.password = payload.password;
    userData.role = USER_ROLE.admin;
    userData.email = payload.admin.email;
    userData.status = USER_STATUS.blocked;
    userData.isVerified = true;
    userData.storePreference = storePreference;

    const session: ClientSession = await connection.startSession();

    try {
      session.startTransaction();

      if (file) {
        const fileKey = addFileToQueue(file, uploadQueue);

        // Use the utility to handle brand casing, suffix, and naming
        const urlMap = await uploadUniqueFiles(storePreference, userData.id!, uploadQueue, folderPathForAdmin);

        uploadedImage = urlMap.get(fileKey!);
        payload.admin.profileImg = uploadedImage;
      } else {
        // Fallback to generated avatar
        payload.admin.profileImg = {
          url: generateAvatar(payload.admin.name),
          publicId: '',
        };
      }

      const newUser = await UserModel.create([userData], { session });
      if (!newUser.length) throw new AppError('Failed to create admin user', httpStatus.BAD_REQUEST);

      payload.admin.id = newUser[0].id;
      payload.admin.user = newUser[0]._id;
      payload.admin.storePreference = storePreference;

      const newAdmin = await AdminModel.create([payload.admin], { session });
      if (!newAdmin.length) throw new AppError('Failed to create admin profile', httpStatus.BAD_REQUEST);

      await session.commitTransaction();
      return newAdmin[0];
    } catch (err: any) {
      // Abort and Purge Ghost Asset if upload succeeded but DB failed
      await session.abortTransaction();

      if (uploadedImage?.publicId) {
        await purgeCloudinaryImages([{ publicId: uploadedImage.publicId }]);
      }

      throw err;
    } finally {
      await session.endSession();
    }
  };

  const changeStatus = async (id: string, payload: { status: string; isVerified?: boolean }) => {
    // Allow updating status AND isVerified (for Admin approval flow)
    const result = await UserModel.findByIdAndUpdate(id, payload, {
      new: true,
    });
    return result;
  };

  const getAllUsers = async (query: Record<string, unknown>) => {
    const userQuery = new QueryBuilder(UserModel, query);

    userQuery
      .search(UserSearchableFields)
      .filter()
      .sort()
      .paginate()
      .limitFields()
      // 1. Join Collections
      .populate({
        from: 'customers',
        localField: '_id',
        foreignField: 'user',
        as: 'customerDetails',
        unwind: true,
      })
      .populate({
        from: 'admins',
        localField: '_id',
        foreignField: 'user',
        as: 'adminDetails',
        unwind: true,
      })
      // 2. Flatten Data
      .customMethod([
        {
          $addFields: {
            name: { $ifNull: ['$adminDetails.name', '$customerDetails.name'] },
            profileImg: { $ifNull: ['$adminDetails.profileImg', '$customerDetails.profileImg'] },
            contactNumber: { $ifNull: ['$adminDetails.contactNo', '$customerDetails.contactNo'] },
          },
        },
        {
          $project: {
            customerDetails: 0,
            adminDetails: 0,
            __v: 0,
            password: 0,
            needsPasswordChange: 0,
            passwordChangedAt: 0,
          },
        },
      ]);

    const result = await userQuery.exec();
    const meta = await userQuery.getQueryMeta();

    return {
      meta,
      result,
    };
  };

  const getSingleUser = async (id: string) => {
    const result = await UserModel.findOne({ id });
    if (!result) {
      throw new AppError('User not found', httpStatus.NOT_FOUND);
    }
    return result;
  };

  const deleteUser = async (id: string, currentUser: JwtPayload) => {
    const session = await connection.startSession();

    try {
      session.startTransaction();

      const targetUser = await UserModel.findOne({ id });
      if (!targetUser) throw new AppError('User not found', httpStatus.NOT_FOUND);

      // 🛡️ RULE 1: NOBODY deletes the Super Admin
      if (targetUser.role === USER_ROLE.super_admin) {
        throw new AppError('Forbidden: Cannot delete Super Admin', httpStatus.FORBIDDEN);
      }

      // 🛡️ RULE 2: Use Stateless Permissions from JWT
      if (currentUser.role === USER_ROLE.admin) {
        const userPermissions = currentUser.permissions || [];
        const hasFullAccess = userPermissions.includes(AdminPermissions.FULL_ACCESS);
        const hasUserManageAccess = userPermissions.includes(AdminPermissions.MANAGE_USERS);

        // Logic A: Admin deleting another Admin
        if (targetUser.role === USER_ROLE.admin && !hasFullAccess) {
          throw new AppError('Forbidden: Only admins with Full Access can remove other staff.', httpStatus.FORBIDDEN);
        }

        // Logic B: Admin deleting a Customer
        if (targetUser.role === USER_ROLE.customer && !hasFullAccess && !hasUserManageAccess) {
          throw new AppError('Forbidden: You do not have permission to manage users.', httpStatus.FORBIDDEN);
        }
      }

      // 2. Perform Soft Deletions
      if (targetUser.role === USER_ROLE.customer) {
        await CustomerModel.findOneAndUpdate({ id }, { isDeleted: true }, { session });
      } else if (targetUser.role === USER_ROLE.admin) {
        await AdminModel.findOneAndUpdate({ id }, { isDeleted: true }, { session });
      }

      const deletedUser = await UserModel.findOneAndUpdate({ id }, { isDeleted: true }, { new: true, session });
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

  const getMe = async (userId: string, role: string) => {
    const updateActiveStatus = UserModel.findByIdAndUpdate(userId, { lastActive: new Date() });

    let profileQuery;
    if (role === USER_ROLE.customer) {
      profileQuery = CustomerModel.findOne({ user: userId }).populate('user');
    } else {
      profileQuery = AdminModel.findOne({ user: userId }).populate('user');
    }

    const [, result] = await Promise.all([updateActiveStatus, profileQuery]);
    if (!result) throw new AppError('User profile not found', httpStatus.NOT_FOUND);

    const profile = result.toObject() as any;
    const authUser = profile.user as any;

    return {
      _id: profile._id,
      id: profile.id,
      email: profile.email,
      name: profile.name,
      profileImg: profile.profileImg,
      contactNumber: profile.contactNo,
      role: authUser.role,
      storePreference: authUser.storePreference || 'bringByAir',
      lastActive: authUser.lastActive,
      ...(profile.permissions && { permissions: profile.permissions }),
      ...(profile.billingAddress && { billingAddress: profile.billingAddress }),
      ...(profile.shippingAddress && { shippingAddress: profile.shippingAddress }),
    };
  };

  const updateAdminProfile = async (userId: string, payload: Partial<IAdmin>, file?: any) => {
    // 🛡️ SECURITY GUARD: Remove email from payload.
    delete (payload as any).email;
    delete (payload as any).id; // Prevent changing custom A-XXXX IDs
    delete (payload as any).user; // Prevent re-assigning auth reference

    if (file) {
      const existing = await AdminModel.findOne({ user: userId });

      // Purge old image if it exists
      if (existing?.profileImg?.publicId) {
        await purgeCloudinaryImages([{ publicId: existing.profileImg.publicId }]);
      }

      const uploadQueue = new Map();
      const fileKey = addFileToQueue(file, uploadQueue);

      // Use storePreference and userId to maintain clean Cloudinary folder structure
      const urlMap = await uploadUniqueFiles(storePreference, userId, uploadQueue, 'Profiles/Admins');
      const uploadedImage = urlMap.get(fileKey!);

      if (uploadedImage) {
        payload.profileImg = {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId,
        };
      }
    }

    const result = await AdminModel.findOneAndUpdate(
      { user: userId },
      { $set: payload },
      { new: true, runValidators: true },
    );

    if (!result) throw new AppError('Admin profile not found', httpStatus.NOT_FOUND);
    return result;
  };

  const updateCustomerProfile = async (userId: string, payload: Partial<ICustomer>, file?: any) => {
    // 🛡️ SECURITY GUARD: Block unauthorized field updates
    delete (payload as any).email;
    delete (payload as any).id;
    delete (payload as any).user;

    if (file) {
      const existing = await CustomerModel.findOne({ user: userId });
      if (existing?.profileImg?.publicId) {
        await purgeCloudinaryImages([{ publicId: existing.profileImg.publicId }]);
      }

      const uploadQueue = new Map();
      const fileKey = addFileToQueue(file, uploadQueue);
      const urlMap = await uploadUniqueFiles(storePreference, userId, uploadQueue, 'Profiles/Customers');
      const uploadedImage = urlMap.get(fileKey!);

      if (uploadedImage) {
        payload.profileImg = {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId,
        };
      }
    }

    const updateData: any = { ...payload };

    if (payload.billingAddress) {
      Object.keys(payload.billingAddress).forEach((key) => {
        updateData[`billingAddress.${key}`] = (payload.billingAddress as any)[key];
      });
      delete updateData.billingAddress;
    }

    if (payload.shippingAddress) {
      Object.keys(payload.shippingAddress).forEach((key) => {
        updateData[`shippingAddress.${key}`] = (payload.shippingAddress as any)[key];
      });
      delete updateData.shippingAddress;
    }

    const result = await CustomerModel.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!result) throw new AppError('Customer profile not found', httpStatus.NOT_FOUND);
    return result;
  };

  return {
    createCustomerIntoDB,
    createAdminIntoDB,
    getAllUsers,
    getSingleUser,
    changeStatus,
    deleteUser,
    getMe,
    updateAdminProfile,
    updateCustomerProfile,
  };
};
