import { Connection, Model, Schema } from 'mongoose';
import { ITransaction } from './Transaction.interface';
import { TransactionMethod, TransactionType, TransactionGateway, PaymentCategory } from './Transaction.constant';
import { storePreferenceConfig } from '@app/modules/Order/Order.model';

export type TTransactionModel = Model<ITransaction>;

const transactionSchema = new Schema<ITransaction>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: TransactionType, required: true },
    method: { type: String, enum: TransactionMethod, required: true },
    storePreference: storePreferenceConfig,
    paymentCategory: {
      type: String,
      paymentCategory: { type: String, enum: PaymentCategory },
    },
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

transactionSchema.index({ order: 1, storePreference: 1 });

export const getTransactionModel = (connection: Connection): TTransactionModel => {
  return (
    (connection.models.Transaction as TTransactionModel) ||
    connection.model<ITransaction>('Transaction', transactionSchema)
  );
};
