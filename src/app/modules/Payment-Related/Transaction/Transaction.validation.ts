import { z } from 'zod';
import { TransactionMethod } from './Transaction.constant';

const addManualTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be positive'),

    method: z.enum(TransactionMethod as unknown as [string, ...string[]]),
    provider: z.string().optional(),
    gatewayTransactionId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const createManualRefundSchema = z.object({
  body: z.object({
    refundMethod: z.enum(TransactionMethod as unknown as [string, ...string[]], {
      message: 'A valid refund method is required',
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
