import { z } from 'zod';

const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
  }),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
  }),
});

const updateSuperAdminEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().email('Please provide a valid new email address'),
    currentPassword: z.string().min(1, 'Current password is required to verify identity'),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
  changePasswordValidationSchema,
  forgetPasswordValidationSchema,
  resetPasswordValidationSchema,
  updateSuperAdminEmailSchema,
};
