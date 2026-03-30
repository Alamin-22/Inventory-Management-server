import { Model, Types } from 'mongoose';
import { USER_ROLE, USER_STATUS } from './user.constants';
import { IAdmin } from '../admin/admin.interface';
import { ICustomer } from '../customer/customer.interface';

export type TUserRole = keyof typeof USER_ROLE;
export type TUserStatus = keyof typeof USER_STATUS;

export interface TUser {
  _id: Types.ObjectId;
  id: string; // Custom ID (e.g. C-00001)
  email: string;
  password?: string; // Optional (Social Login)

  needsPasswordChange: boolean;
  role: TUserRole;
  status: TUserStatus;
  isVerified: boolean;
  isDeleted: boolean;

  authProvider?: 'email' | 'google' | 'facebook';
  storePreference: 'bringByAir' | 'pandaBD';

  passwordChangedAt?: Date;
  // Virtual References
  customerProfile?: Types.ObjectId;
  adminProfile?: Types.ObjectId;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TCustomerPayload = {
  password?: string;
  customer: ICustomer;
};

export type TAdminPayload = {
  password?: string;
  admin: IAdmin;
  
};

export interface TUserModel extends Model<TUser> {
  // eslint-disable-next-line no-unused-vars
  isUserExistByEmail(email: string): Promise<TUser | null>;
  // eslint-disable-next-line no-unused-vars
  isUserExistByCustomId(id: string): Promise<TUser | null>;
  // eslint-disable-next-line no-unused-vars
  isPasswordMatched(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
  // eslint-disable-next-line no-unused-vars
  isJWTIssuedBeforePasswordChanged(passwordChangedTimestamp: Date, jwtIssuedTimestamp: number): boolean;
}
