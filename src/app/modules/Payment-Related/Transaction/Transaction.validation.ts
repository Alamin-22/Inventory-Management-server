import { z } from 'zod';

const addManualTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),
    method: z.enum(['cod', 'bank_transfer', 'mobile_banking', 'cash']),
    provider: z.string().optional(),
    gatewayTransactionId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const createManualRefundSchema = z.object({
  body: z.object({
    refundMethod: z.enum(['bank_transfer', 'mobile_banking', 'manual_refund'], {
      message: 'Refund method is required',
    }),
    provider: z.string().optional(),
    transactionId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const TransactionValidations = {
  addManualTransactionSchema,
  createManualRefundSchema,
};
