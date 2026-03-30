import { Model, Types } from 'mongoose';

export interface ICustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface ICustomer {
  _id: Types.ObjectId;
  id: string; // e.g., CUST-00001

  name: string;
  contactNo: string; // Primary key for retail
  email?: string; // Optional for walk-ins

  customerType: 'retail' | 'wholesale' | 'corporate';
  companyName?: string;
  taxId?: string;

  billingAddress?: ICustomerAddress;
  shippingAddress?: ICustomerAddress;

  totalOrders: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TCustomerModel extends Model<ICustomer> {
  // eslint-disable-next-line no-unused-vars
  isCustomerExists(id: string): Promise<ICustomer | null>;
}
