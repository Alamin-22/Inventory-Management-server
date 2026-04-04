import { z } from 'zod';
import { ORDER_STATUS } from './Order.constant';

const OrderItemSchema = z.object({
  product: z.string({ error: 'Product ID is required' }),
  variantId: z.string({ error: 'Variant ID is required' }),
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
});

const CreateOrderSchema = z.object({
  body: z.object({
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerEmail: z.string().email().optional().or(z.literal('')),
    shippingAddress: z.string().optional(),
    items: z.array(OrderItemSchema).min(1, 'Order must contain at least one item.'),
    paymentInfo: z
      .object({
        paidAmount: z.number().min(0).optional(),
      })
      .optional(),
    status: z.enum(Object.values(ORDER_STATUS) as [string, ...string[]]).optional(),
  }),
});

const ConfirmOrderSchema = z.object({
  body: z.object({
    orderId: z.string({ error: 'Order ID is required' }),
    shippingFee: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
  }),
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    newStatus: z.enum(Object.values(ORDER_STATUS) as [string, ...string[]]),
    notes: z.string().optional(),
    notifyCustomer: z.boolean().optional(),
  }),
});

const deleteMultipleArchivedOrdersSchema = z.object({
  body: z.object({
    order_ids: z.array(z.string()),
  }),
});

export const OrderValidationSchemas = {
  CreateOrderSchema,
  ConfirmOrderSchema,
  updateOrderStatusSchema,
  deleteMultipleArchivedOrdersSchema,
};
