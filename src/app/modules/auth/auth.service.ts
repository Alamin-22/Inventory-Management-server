/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { Connection } from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '@config/env';
import { AppError } from '@app/classes/AppError';
import {
  TBrand,
  TChangePasswordPayload,
  TLoginUser,
  TResetPasswordPayload,
  TSocialLoginPayload,
} from './auth.interface';
import { USER_ROLE, USER_STATUS } from '../user/user.constants';
import { createToken, SignOptions, VerifyToken } from './auth.utils';
import { generateUserId } from '../user/user.utils';
import { sendEmail } from '@utils/sendEmail';
import { JwtPayload } from 'jsonwebtoken';
import { getUserModel } from '../user/user.model';
import { getCustomerModel } from '../customer/customer.model';
import ForgotPasswordTemplate from '@app/Email_Templates/Authentication-Related/forgotPassword.template';
import { NewsLetterService } from '../Promotions/NewsLetter/NewsLetter.service';
import { getAdminModel } from '../admin/admin.model';
import { TAdminPermission } from '../admin/admin.constant';

const sanitizeUser = (user: any) => {
  const userObj = user.toObject ? user.toObject() : user;

  // Remove Sensitive Fields
  delete userObj.password;
  delete userObj.__v;
  delete userObj.isDeleted;
  delete userObj.authProvider;
  delete userObj.isVerified;
  delete userObj.needsPasswordChange;
  delete userObj.passwordChangedAt;

  return userObj;
};

export const AuthServices = (connection: Connection, storePreference: TBrand) => {
  const UserModel = getUserModel(connection);
  const CustomerModel = getCustomerModel(connection);
  const AdminModel = getAdminModel(connection);

  // 1. Local Login Service
  const loginUser = async (payload: TLoginUser) => {
    const { email, password, verificationToken } = payload;

    // 1. Check if user exists
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) throw new AppError('User does not exist', httpStatus.NOT_FOUND);

    // 2. Safety Checks
    if (user.isDeleted) throw new AppError('This user is deleted', httpStatus.FORBIDDEN);
    if (user.status === USER_STATUS.blocked) throw new AppError('This user is blocked', httpStatus.FORBIDDEN);

    // 3. HANDLE VERIFICATION ON THE FLY
    if (!user.isVerified && verificationToken) {
      try {
        const decoded = VerifyToken(verificationToken, config.accessTokenSecret as string);

        if (decoded.email !== email) {
          throw new AppError('Verification token does not match this email', httpStatus.UNAUTHORIZED);
        }

        // Token Valid -> Activate User in Database
        await UserModel.findByIdAndUpdate(user._id, { isVerified: true });
        user.isVerified = true;

        // --- SYNC TO NEWSLETTER ---
        // Since the user is now 100% verified, we add them to the marketing list
        if (user.role === 'customer') {
          const customer = await CustomerModel.findOne({ user: user._id });

          // Non-blocking sync
          NewsLetterService(connection, storePreference)
            .syncSubscriber({
              email: user.email,
              name: customer?.name || 'Customer',
              source: 'user-registration',
            })
            .catch((err) => console.error('Newsletter Sync Error during Verification:', err));
        }
      } catch (err) {
        console.log(err);
        throw new AppError('Verification token is invalid or expired', httpStatus.UNAUTHORIZED);
      }
    }

    // 4. Block unverified users who didn't provide a token
    if (!user.isVerified) {
      throw new AppError('Your account is not verified. Please check your email.', httpStatus.FORBIDDEN);
    }

    // 5. Password Check
    if (!user.password) throw new AppError('Please login with social provider', httpStatus.BAD_REQUEST);
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) throw new AppError('Password incorrect', httpStatus.UNAUTHORIZED);

    let permissions: TAdminPermission[] = [];

    if (user.role === USER_ROLE.admin || user.role === USER_ROLE.editor) {
      const adminProfile = await AdminModel.findOne({ user: user._id }).lean();
      permissions = adminProfile?.permissions || [];
    }

    // 6. Generate Session Tokens
    const jwtPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      permissions,
    };
    const accessToken = createToken(
      jwtPayload,
      config.accessTokenSecret as string,
      config.jwt_access_expires_in as SignOptions['expiresIn'],
    );
    const refreshToken = createToken(
      jwtPayload,
      config.refreshTokenSecret as string,
      config.jwt_refresh_expires_in as SignOptions['expiresIn'],
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  };

  // 2. Social Login Service (Google)
  const socialLogin = async (payload: TSocialLoginPayload) => {
    const session = await connection.startSession();

    try {
      session.startTransaction();

      // Check if user exists
      const existingUser = await UserModel.findOne({ email: payload.email });

      //  SCENARIO A: User Exists -> Log them in
      if (existingUser) {
        if (existingUser.status === USER_STATUS.blocked) {
          throw new AppError('This user is blocked!', httpStatus.FORBIDDEN);
        }

        await session.commitTransaction();
        await session.endSession();

        const jwtPayload = {
          userId: existingUser._id.toString(),
          role: existingUser.role,
          email: existingUser.email,
          permissions: [],
        };

        const accessToken = createToken(
          jwtPayload,
          config.accessTokenSecret as string,
          config.jwt_access_expires_in as SignOptions['expiresIn'],
        );

        const refreshToken = createToken(
          jwtPayload,
          config.refreshTokenSecret as string,
          config.jwt_refresh_expires_in as SignOptions['expiresIn'],
        );

        return { accessToken, refreshToken, user: sanitizeUser(existingUser) };
      }

      //  SCENARIO B: Register New User
      const newUserId = await generateUserId(USER_ROLE.customer, connection);

      const userData = {
        id: newUserId,
        email: payload.email,
        role: USER_ROLE.customer,
        status: USER_STATUS.active,
        authProvider: 'google',
        storePreference,
      };

      const newUser = await UserModel.create([userData], { session });
      if (!newUser.length) throw new AppError('Failed to create user', httpStatus.BAD_REQUEST);

      const customerData = {
        id: newUserId,
        user: newUser[0]._id,
        name: payload.name || 'User',
        email: payload.email,
        contactNo: '',
        profileImg: payload.image,
        storePreference,
      };

      const newCustomer = await CustomerModel.create([customerData], { session });
      if (!newCustomer.length) throw new AppError('Failed to create customer', httpStatus.BAD_REQUEST);

      await session.commitTransaction();
      await session.endSession();

      // Generate Tokens for New User
      const jwtPayload = {
        userId: newUser[0]._id.toString(),
        role: newUser[0].role,
        email: newUser[0].email,
        permissions: [],
      };

      const accessToken = createToken(
        jwtPayload,
        config.accessTokenSecret as string,
        config.jwt_access_expires_in as SignOptions['expiresIn'],
      );

      const refreshToken = createToken(
        jwtPayload,
        config.refreshTokenSecret as string,
        config.jwt_refresh_expires_in as SignOptions['expiresIn'],
      );

      return { accessToken, refreshToken, user: sanitizeUser(newUser[0]) };
    } catch (err: any) {
      await session.abortTransaction();
      await session.endSession();
      throw new AppError(err.message || 'Social Login Failed', httpStatus.BAD_REQUEST);
    }
  };

  // 3. Refresh Token Service
  const refreshToken = async (token: string) => {
    // Verify the old refresh token
    const decoded = VerifyToken(token, config.refreshTokenSecret as string);

    const { email, iat } = decoded;

    // Check if user still exists
    const user = await UserModel.findOne({ email });
    if (!user) throw new AppError('User not found', httpStatus.NOT_FOUND);
    if (user.isDeleted) throw new AppError('User is deleted', httpStatus.FORBIDDEN);
    if (user.status === 'blocked') throw new AppError('User is blocked', httpStatus.FORBIDDEN);

    // Check if password changed AFTER token was issued
    if (user.passwordChangedAt && UserModel.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)) {
      throw new AppError('Session expired', httpStatus.UNAUTHORIZED);
    }

    let permissions: TAdminPermission[] = [];

    if (user.role === USER_ROLE.admin || user.role === USER_ROLE.editor) {
      const adminProfile = await AdminModel.findOne({ user: user._id }).lean();
      permissions = adminProfile?.permissions || [];
    }

    // Issue new Access Token
    const jwtPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      permissions,
    };

    const accessToken = createToken(
      jwtPayload,
      config.accessTokenSecret as string,
      config.jwt_access_expires_in as SignOptions['expiresIn'],
    );

    return { accessToken };
  };

  // 4. Change Password (Authenticated)
  const changePassword = async (userData: JwtPayload, payload: TChangePasswordPayload) => {
    // 1. Check if user exists
    const user = await UserModel.findOne({ email: userData.email }).select('+password');
    if (!user) {
      throw new AppError('User not found', httpStatus.NOT_FOUND);
    }

    // 2. Check if account is Social Login (no password)
    if (!user.password) {
      throw new AppError('Social Login accounts cannot change password', httpStatus.BAD_REQUEST);
    }

    // 3. Verify Old Password
    const isPasswordMatched = await bcrypt.compare(payload.oldPassword, user.password);
    if (!isPasswordMatched) {
      throw new AppError('Old password incorrect', httpStatus.UNAUTHORIZED);
    }

    // 4. Update Password
    // Note: The 'pre-save' hook in User model will auto-hash this!
    user.password = payload.newPassword;
    user.needsPasswordChange = false; // Reset flag if it was true
    user.passwordChangedAt = new Date(); // Update timestamp to invalidate old tokens

    await user.save();

    return null;
  };

  // 5. Forget Password (Public)
  const forgetPassword = async (email: string) => {
    // 1. Check User
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError('User not found', httpStatus.NOT_FOUND);
    }

    if (!user.password && user.authProvider !== 'email') {
      throw new AppError('This account uses Social Login. Please login with Google.', httpStatus.BAD_REQUEST);
    }

    // 2. Generate Reset Token (Short lived: 10 mins)
    const resetToken = createToken(
      { userId: user._id.toString(), role: user.role, email: user.email },
      config.accessTokenSecret as string,
      '10m',
    );

    const clientUrl = config.client[storePreference].url;

    const resetUILink = `${clientUrl}/reset-password?email=${user.email}&token=${resetToken}`;

    // 4. Send Email
    try {
      const brandName = storePreference === 'bringByAir' ? 'Bring By Air' : 'PandaBD';
      const subject = `Reset Your Password - ${brandName}`;

      const emailHtml = ForgotPasswordTemplate(user.email, user.email, resetUILink, storePreference);

      await sendEmail(user.email, subject, emailHtml, storePreference);
    } catch (err) {
      console.log('Email Error:', err);
      throw new AppError('Failed to send email', httpStatus.INTERNAL_SERVER_ERROR);
    }

    return null;
  };

  // 6. Reset Password (Public - with Token)
  const resetPassword = async (payload: TResetPasswordPayload, token: string) => {
    // 1. Check if token provided
    if (!token) {
      throw new AppError('Unauthorized access', httpStatus.UNAUTHORIZED);
    }

    // 2. Verify Token
    const decoded = VerifyToken(token, config.accessTokenSecret as string);

    if (!decoded) {
      throw new AppError('Invalid or Expired Token', httpStatus.UNAUTHORIZED);
    }

    // 3. Find User
    const user = await UserModel.findOne({ email: decoded.email }).select('+password');
    if (!user) {
      throw new AppError('User not found', httpStatus.NOT_FOUND);
    }

    // 4. Set New Password
    user.password = payload.newPassword;
    user.passwordChangedAt = new Date(); // Invalidates previous sessions
    await user.save();

    return null;
  };

  const updateSuperAdminEmail = async (userId: string, payload: { newEmail: string; currentPassword: string }) => {
    const session = await connection.startSession();

    try {
      session.startTransaction();

      // 1. Identity Check
      const user = await UserModel.findById(userId).select('+password');
      if (!user || user.role !== USER_ROLE.super_admin) {
        throw new AppError('Unauthorized: This action is reserved for the Super Admin.', httpStatus.FORBIDDEN);
      }

      // 2. Password Challenge (Level 1 Security)
      const isMatch = await bcrypt.compare(payload.currentPassword, user.password!);
      if (!isMatch) {
        throw new AppError('Security Check Failed: Incorrect current password.', httpStatus.UNAUTHORIZED);
      }

      // 3. Uniqueness Check
      const emailExists = await UserModel.findOne({ email: payload.newEmail.toLowerCase() });
      if (emailExists) {
        throw new AppError('Conflict: This email is already registered to another account.', httpStatus.CONFLICT);
      }

      // 4. Atomic Multi-Collection Update
      // We update Auth (User) and the Admin Profile simultaneously
      await UserModel.findByIdAndUpdate(
        userId,
        { email: payload.newEmail.toLowerCase(), isVerified: true }, // Auto-verify since Owner is doing this
        { session },
      );

      await AdminModel.findOneAndUpdate({ user: userId }, { email: payload.newEmail.toLowerCase() }, { session });

      await session.commitTransaction();

      return { success: true, message: 'Owner identity updated. Please log in with your new credentials.' };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  };

  return {
    loginUser,
    socialLogin,
    refreshToken,
    changePassword,
    forgetPassword,
    resetPassword,
    updateSuperAdminEmail,
  };
};
