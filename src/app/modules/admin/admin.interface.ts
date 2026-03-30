import { Model, Types } from 'mongoose';
import { TAdminPermission } from './admin.constants';

export interface IAdmin {
  _id: Types.ObjectId;
  id: string; // User ID (A-00001)
  user: Types.ObjectId; // refers to user model

  name: string;
  email: string;
  contactNo: string;
  profileImg?: {
    url: string;
    publicId: string;
  };

  storePreference: 'bringByAir' | 'pandaBD';

  permissions: TAdminPermission[];
  isDeleted: boolean;
}

export interface TAdminModel extends Model<IAdmin> {
  // eslint-disable-next-line no-unused-vars
  isAdminExists(id: string): Promise<IAdmin | null>;
}
