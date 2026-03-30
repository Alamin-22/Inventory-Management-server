import { Model, Types } from 'mongoose';

export interface ICustomerAddress {
  address?: string;
  country?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ICustomer {
  _id: Types.ObjectId;
  id: string; // Copy of User ID (C-00001)
  user: Types.ObjectId; // Reference to Auth User

  name: string;
  email: string;
  contactNo: string;
  profileImg?: {
    url: string;
    publicId: string;
  };

  storePreference: 'bringByAir' | 'pandaBD';

  billingAddress?: ICustomerAddress;
  shippingAddress?: ICustomerAddress;

  isDeleted: boolean;
}

export interface TCustomerModel extends Model<ICustomer> {
  // eslint-disable-next-line no-unused-vars
  isCustomerExists(id: string): Promise<ICustomer | null>;
}
