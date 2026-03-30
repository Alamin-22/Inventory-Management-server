import { z } from 'zod';

const addressSchema = z.object({
  address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
});

const updateCustomerZodSchema = z.object({
  body: z.object({
    name: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
      .optional(),
    contactNo: z.string().optional(),
    storePreference: z.enum(['bringByAir', 'pandaBD']).optional(),

    billingAddress: addressSchema.optional(),
    shippingAddress: addressSchema.optional(),
  }),
});

export const CustomerValidation = {
  updateCustomerZodSchema,
};
