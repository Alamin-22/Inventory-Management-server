import { z } from 'zod';
import { orderStatusEnum } from './Order.constant';

const AddressSchema = z.object({
  name: z.string(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string().optional(),
});

const CreateOrderSchema = z.object({
  body: z.object({
    billingAddress: AddressSchema.optional(),
    shippingAddress: AddressSchema,
    email: z.string().email().optional(),
    orderNote: z.string().optional(),
  }),
});

const ConfirmOrderSchema = z.object({
  body: z.object({
    tax: z.number(),
    shippingFee: z.number(),
    orderNumber: z.string(),
    overrideNoteHtml: z.string().optional(),
  }),
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    newStatus: z.enum([...orderStatusEnum] as [string, ...string[]]),
  }),
});

const sendPaymentReminderSchema = z.object({
  body: z.object({
    orderNumber: z.string(),
  }),
});

const deleteMultipleArchivedOrdersSchema = z.object({
  body: z.object({
    order_ids: z.array(z.string()),
  }),
});
const sendReminderToAbandonedSchema = z.object({
  body: z.object({
    orderNumbers: z.array(z.string()),
  }),
});

const joinGroupBuyCampaignSchema = z.object({
  body: z.object({
    campaignId: z.string({ error: 'Campaign ID is required' }),
    gateway: z.enum(['amarpay', 'stripe'], { error: 'Please select a valid gateway' }),
    shippingAddress: AddressSchema,
    email: z.string().email('A valid email is required'),
    quantity: z.number().min(1).default(1).optional(),
  }),
});

export const OrderValidationSchemas = {
  CreateOrderSchema,
  ConfirmOrderSchema,
  updateOrderStatusSchema,
  sendPaymentReminderSchema,
  deleteMultipleArchivedOrdersSchema,
  sendReminderToAbandonedSchema,
  joinGroupBuyCampaignSchema,
};
