import httpStatus from 'http-status';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '@config/env';
import { AppError } from '@app/classes/AppError';
import { TChangePasswordPayload, TLoginUser, TResetPasswordPayload } from './auth.interface';
import { USER_ROLE, USER_STATUS } from '../user/user.constants';
import { createToken, SignOptions, VerifyToken } from './auth.utils';
import { sendEmail } from '@utils/sendEmail';
import { JwtPayload } from 'jsonwebtoken';
import { User } from '../user/user.model';
import { Admin } from '../admin/admin.model';
import ForgotPasswordTemplate from '@app/Email_Templates/Authentication-Related/forgotPassword.template';
import { TAdminPermission } from '../admin/admin.constant';
import { TUserRole } from '../user/user.interface';

const loginUser = async (payload: TLoginUser) => {
  const { email, password } = payload;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new AppError('User does not exist', httpStatus.NOT_FOUND);

  if (user.isDeleted) throw new AppError('This user is deleted', httpStatus.FORBIDDEN);
  if (user.status === USER_STATUS.blocked) throw new AppError('This user is blocked', httpStatus.FORBIDDEN);

  if (!user.password) throw new AppError('Invalid account type', httpStatus.BAD_REQUEST);

  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) throw new AppError('Password incorrect', httpStatus.UNAUTHORIZED);

  let permissions: TAdminPermission[] = [];
  if (user.role === USER_ROLE.admin || user.role === USER_ROLE.manager || user.role === USER_ROLE.super_admin) {
    const adminProfile = await Admin.findOne({ user: user._id }).lean();
    permissions = adminProfile?.permissions || [];
  }

  const jwtPayload = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
    permissions,
  };

  const accessToken = createToken(
    jwtPayload,
    config.accessTokenSecret,
    config.jwtAccessExpiresIn as SignOptions['expiresIn'],
  );
  const refreshToken = createToken(
    jwtPayload,
    config.refreshTokenSecret,
    config.jwtRefreshExpiresIn as SignOptions['expiresIn'],
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};

const getMe = async (userId: string, role: string) => {
  let result;

  const rolesWithProfiles: TUserRole[] = [USER_ROLE.super_admin, USER_ROLE.admin, USER_ROLE.manager];

  if (rolesWithProfiles.includes(role as TUserRole)) {
    result = await User.findById(userId)
      // 1. Parent (User): Inclusion only
      .select('id email role status adminProfile')
      .populate({
        path: 'adminProfile',
        select: 'name email contactNo permissions profileImg -_id',
      })
      .lean();
  }

  if (!result) {
    throw new AppError('User session not found', httpStatus.NOT_FOUND);
  }

  return result;
};

const refreshToken = async (token: string) => {
  const decoded = VerifyToken(token, config.refreshTokenSecret);
  const { email, iat } = decoded;

  const user = await User.findOne({ email });
  if (!user) throw new AppError('User not found', httpStatus.NOT_FOUND);
  if (user.isDeleted) throw new AppError('User is deleted', httpStatus.FORBIDDEN);
  if (user.status === 'blocked') throw new AppError('User is blocked', httpStatus.FORBIDDEN);

  if (user.passwordChangedAt && User.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)) {
    throw new AppError('Session expired', httpStatus.UNAUTHORIZED);
  }

  let permissions: TAdminPermission[] = [];
  if (user.role === USER_ROLE.admin || user.role === USER_ROLE.manager || user.role === USER_ROLE.super_admin) {
    const adminProfile = await Admin.findOne({ user: user._id }).lean();
    permissions = adminProfile?.permissions || [];
  }

  const jwtPayload = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
    permissions,
  };

  const accessToken = createToken(
    jwtPayload,
    config.accessTokenSecret,
    config.jwtAccessExpiresIn as SignOptions['expiresIn'],
  );
  return { accessToken };
};

const changePassword = async (userData: JwtPayload, payload: TChangePasswordPayload) => {
  const user = await User.findOne({ email: userData.email }).select('+password');
  if (!user) throw new AppError('User not found', httpStatus.NOT_FOUND);

  const isPasswordMatched = await bcrypt.compare(payload.oldPassword, user.password!);
  if (!isPasswordMatched) throw new AppError('Old password incorrect', httpStatus.UNAUTHORIZED);

  user.password = payload.newPassword;
  user.needsPasswordChange = false;
  user.passwordChangedAt = new Date();
  await user.save();

  return null;
};

const forgetPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError('User not found', httpStatus.NOT_FOUND);

  const resetToken = createToken(
    { userId: user._id.toString(), role: user.role, email: user.email },
    config.accessTokenSecret,
    '10m',
  );

  const resetUILink = `${config.client.url}/reset-password?email=${user.email}&token=${resetToken}`;

  try {
    const subject = `Reset Your Password - Inventory System`;
    const emailHtml = ForgotPasswordTemplate(user.email, user.email, resetUILink, 'System');
    await sendEmail(user.email, subject, emailHtml);
  } catch (err) {
    console.log('Email Error:', err);
    throw new AppError('Failed to send email', httpStatus.INTERNAL_SERVER_ERROR);
  }

  return null;
};

const resetPassword = async (payload: TResetPasswordPayload, token: string) => {
  if (!token) throw new AppError('Unauthorized access', httpStatus.UNAUTHORIZED);

  const decoded = VerifyToken(token, config.accessTokenSecret);
  if (!decoded) throw new AppError('Invalid or Expired Token', httpStatus.UNAUTHORIZED);

  const user = await User.findOne({ email: decoded.email }).select('+password');
  if (!user) throw new AppError('User not found', httpStatus.NOT_FOUND);

  user.password = payload.newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  return null;
};

const updateSuperAdminEmail = async (userId: string, payload: { newEmail: string; currentPassword: string }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findById(userId).select('+password');
    if (!user || user.role !== USER_ROLE.super_admin) {
      throw new AppError('Unauthorized: This action is reserved for the Super Admin.', httpStatus.FORBIDDEN);
    }

    const isMatch = await bcrypt.compare(payload.currentPassword, user.password!);
    if (!isMatch) throw new AppError('Security Check Failed: Incorrect current password.', httpStatus.UNAUTHORIZED);

    const emailExists = await User.findOne({ email: payload.newEmail.toLowerCase() });
    if (emailExists) throw new AppError('Conflict: This email is already registered.', httpStatus.CONFLICT);

    await User.findByIdAndUpdate(userId, { email: payload.newEmail.toLowerCase() }, { session });
    await Admin.findOneAndUpdate({ user: userId }, { email: payload.newEmail.toLowerCase() }, { session });

    await session.commitTransaction();
    return { success: true, message: 'Owner identity updated. Please log in with your new credentials.' };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
};

export const AuthServices = {
  loginUser,
  refreshToken,
  changePassword,
  forgetPassword,
  resetPassword,
  updateSuperAdminEmail,
  getMe,
};
