import { Types, Document } from 'mongoose';
import { TransactionMethod, TransactionType, TransactionGateway, PaymentCategory } from './Transaction.constant';

export type TTransactionType = (typeof TransactionType)[number];
export type TTransactionMethod = (typeof TransactionMethod)[number];
export type TTransactionGateway = (typeof TransactionGateway)[number];
export type TPaymentCategory = (typeof PaymentCategory)[number];

export interface ITransaction extends Document {
  order: Types.ObjectId;
  amount: number;
  type: TTransactionType;
  method: TTransactionMethod;
  paymentCategory?: TPaymentCategory;

  gatewayInfo?: {
    gateway: TTransactionGateway;
    bankTransactionId: string; // pg_txnid or manual trx ID
    storeTransactionId: string; // mer_txnid
    paidBy?: string; // bKash, Visa, Cash, etc.
  };

  notes?: string;
  recordedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
