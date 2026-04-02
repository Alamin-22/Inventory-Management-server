import { Types } from 'mongoose';
import { TBrand } from '../../auth/auth.interface';
import { TransactionMethod, TransactionType, TransactionGateway, PaymentCategory } from './Transaction.constant';

export type TTransactionType = (typeof TransactionType)[number];
export type TTransactionMethod = (typeof TransactionMethod)[number];
export type TTransactionGateway = (typeof TransactionGateway)[number];
export type TPaymentCategory = (typeof PaymentCategory)[number];

export interface ITransaction {
  order: Types.ObjectId;
  amount: number;
  type: TTransactionType;
  method: TTransactionMethod;
  storePreference: TBrand;
  paymentCategory?: TPaymentCategory;

  gatewayInfo?: {
    gateway: TTransactionGateway;
    bankTransactionId: string; // pg_txnid
    storeTransactionId: string; // mer_txnid
    paidBy?: string; // bKash, Visa, etc.
  };

  notes?: string;
  recordedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
