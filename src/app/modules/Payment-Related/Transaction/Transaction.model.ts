import mongoose, { Model, Schema } from 'mongoose';
import { ITransaction } from './Transaction.interface';
import { TransactionMethod, TransactionType, TransactionGateway, PaymentCategory } from './Transaction.constant';

export type TTransactionModel = Model<ITransaction>;

const transactionSchema = new Schema<ITransaction>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: TransactionType, required: true },
    method: { type: String, enum: TransactionMethod, required: true },

    paymentCategory: { type: String, enum: PaymentCategory },

    gatewayInfo: {
      gateway: { type: String, enum: TransactionGateway },
      bankTransactionId: { type: String },
      storeTransactionId: { type: String },
      paidBy: { type: String },
    },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

transactionSchema.index({ order: 1 });
transactionSchema.index({ type: 1 });

export const TransactionModel = mongoose.model<ITransaction, TTransactionModel>('Transaction', transactionSchema);
