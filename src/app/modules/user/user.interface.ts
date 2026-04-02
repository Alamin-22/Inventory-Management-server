import { Model, Types } from 'mongoose';
import { USER_ROLE, USER_STATUS } from './user.constants';

export type TUserRole = keyof typeof USER_ROLE;
export type TUserStatus = keyof typeof USER_STATUS;

export interface TUser {
  _id: Types.ObjectId;
  id: string;
  email: string;
  password?: string;

  needsPasswordChange: boolean;
  role: TUserRole;
  status: TUserStatus;
  isVerified: boolean;
  isDeleted: boolean;

  passwordChangedAt?: Date;
  lastActive?: Date;

  // Virtual Reference to the Admin profile
  adminProfile?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

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
