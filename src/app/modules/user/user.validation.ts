import { z } from 'zod';
import { AdminPermissions } from '../admin/admin.constant';

// Customer Validation
const createCustomerValidationSchema = z.object({
  body: z.object({
    // Auth Data (Clean & Separate)
    password: z.string().max(20),
    storePreference: z.enum(['bringByAir', 'pandaBD']).optional().default('bringByAir'),

    // Profile Data
    customer: z.object({
      name: z.string(),
      email: z.string().email('Invalid email address'),
      contactNo: z.string().optional(),

      // Address is optional on creation
      billingAddress: z
        .object({
          address: z.string(),
          country: z.string(),
          city: z.string(),
        })
        .optional(),
    }),
  }),
});

// Admin Validation
const createAdminValidationSchema = z.object({
  body: z.object({
    password: z.string().max(20),
    admin: z.object({
      name: z.string(),
      email: z.string().email(),
      contactNo: z.string(),
      permissions: z.array(z.nativeEnum(AdminPermissions)).min(1, 'At least one permission is required'),
    }),
  }),
});

const changeStatusValidationSchema = z.object({
  body: z.object({
    // Allow updating status to 'active' or 'blocked'
    status: z.enum(['active', 'blocked']).optional(),

    // Allow Admins to manually verify a user (Crucial for the Admin approval flow)
    isVerified: z.boolean().optional(),
  }),
});

export const UserValidation = {
  createCustomerValidationSchema,
  createAdminValidationSchema,
  changeStatusValidationSchema,
};
