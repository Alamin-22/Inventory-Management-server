/* eslint-disable @typescript-eslint/no-this-alias */
import mongoose, { Schema } from 'mongoose';
import { TUser, TUserModel } from './user.interface';
import bcrypt from 'bcrypt';
import { config } from '@config/env';
import { USER_ROLE, USER_STATUS } from './user.constants';

const userSchema = new Schema<TUser, TUserModel>(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false, select: 0 },
    needsPasswordChange: { type: Boolean, default: false },
    role: { type: String, enum: Object.keys(USER_ROLE), default: USER_ROLE.manager },
    status: { type: String, enum: Object.keys(USER_STATUS), default: USER_STATUS.active },
    passwordChangedAt: { type: Date },
    lastActive: { type: Date },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// --- Virtuals ---
userSchema.virtual('adminProfile', {
  ref: 'Admin',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

// --- Hooks ---
userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('password')) return next();
  user.password = await bcrypt.hash(user.password!, Number(config.bcryptSaltRounds));
  next();
});

userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

// --- Statics ---
userSchema.statics.isUserExistByEmail = async function (email: string) {
  return await this.findOne({ email }).select('+password');
};

userSchema.statics.isUserExistByCustomId = async function (id: string) {
  return await this.findOne({ id }).select('+password');
};

userSchema.statics.isPasswordMatched = async function (plainTextPassword, hashedPassword) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimeStamp: Date,
  JwtIssuedTimeStamp: number,
) {
  if (!passwordChangedTimeStamp) {
    // If password was never changed, the token cannot be "issued before" a change.
    // So we return false (meaning the token is perfectly valid).
    return false;
  }

  const passwordChangedTime = Math.trunc(passwordChangedTimeStamp.getTime() / 1000);

  // Return TRUE ONLY IF the token is OLDER (less than) the password change time.
  return passwordChangedTime > JwtIssuedTimeStamp;
};

export const User = mongoose.model<TUser, TUserModel>('User', userSchema);
