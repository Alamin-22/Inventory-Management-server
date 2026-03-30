import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

const createCustomerZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    contactNo: z.string().min(1, 'Contact number is required'),
    email: z.string().email().optional(),
    customerType: z.enum(['retail', 'wholesale', 'corporate']).optional(),
    companyName: z.string().optional(),
    taxId: z.string().optional(),
    billingAddress: addressSchema.optional(),
    shippingAddress: addressSchema.optional(),
  }),
});

const updateCustomerZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    contactNo: z.string().optional(),
    email: z.string().email().optional(),
    customerType: z.enum(['retail', 'wholesale', 'corporate']).optional(),
    companyName: z.string().optional(),
    taxId: z.string().optional(),
    billingAddress: addressSchema.optional(),
    shippingAddress: addressSchema.optional(),
  }),
});

export const CustomerValidation = {
  createCustomerZodSchema,
  updateCustomerZodSchema,
};
