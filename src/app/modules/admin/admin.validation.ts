import { z } from 'zod';
import { AdminPermissions } from './admin.constants';

const validPermissions = Object.values(AdminPermissions) as [string, ...string[]];

const updateAdminZodSchema = z.object({
  body: z.object({
    name: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .optional(),
    contactNo: z.string().optional(),
    permissions: z.array(z.enum(validPermissions)).optional(),
  }),
});

export const AdminValidation = {
  updateAdminZodSchema,
};
