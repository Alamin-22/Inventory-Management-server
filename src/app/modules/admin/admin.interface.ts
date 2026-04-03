import { Model, Types } from 'mongoose';
import { TAdminPermission } from './admin.constant';

export interface IAdmin {
  _id: Types.ObjectId;
  id: string; // Custom ID (e.g., A-00001)
  user: Types.ObjectId; // Reference to Auth User

  name: string;
  email: string;
  contactNo: string;

  profileImg?: string;

  permissions: TAdminPermission[];

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TAdminModel extends Model<IAdmin> {
  // eslint-disable-next-line no-unused-vars
  isAdminExists(id: string): Promise<IAdmin | null>;
}
