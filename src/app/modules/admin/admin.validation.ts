import { z } from 'zod';
import { AdminPermissions } from './admin.constant';

const createAdminZodSchema = z.object({
  body: z.object({
    password: z.string().min(6).max(20).optional(),
    admin: z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email address'),
      contactNo: z.string().min(1, 'Contact number is required'),
      permissions: z.array(z.nativeEnum(AdminPermissions)).min(1, 'At least one permission is required'),
    }),
  }),
});

const updateAdminZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    contactNo: z.string().optional(),
    permissions: z.array(z.nativeEnum(AdminPermissions)).optional(),
  }),
});

export const AdminValidation = {
  createAdminZodSchema,
  updateAdminZodSchema,
};
