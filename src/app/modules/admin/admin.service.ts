import httpStatus from 'http-status';
import { IAdmin } from './admin.interface';
import { AppError } from '@app/classes/AppError';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { Admin } from './admin.model';
import { AdminSearchableFields } from './admin.constant';

const getAllAdmins = async (query: Record<string, unknown>) => {
  const adminQuery = new QueryBuilder(Admin, query)
    .search(AdminSearchableFields)
    .filter()
    .sort()
    .paginate()
    .populate({
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'authDetails',
      unwind: true,
    })
    .limitFields();

  const result = await adminQuery.exec();
  const meta = await adminQuery.getQueryMeta();

  return { meta, result };
};

const getSingleAdmin = async (id: string) => {
  const result = await Admin.findOne({ id }).populate('user');
  if (!result) throw new AppError('Staff member not found', httpStatus.NOT_FOUND);
  return result;
};

//  Completely excludes email, id, and user references from the payload
export type TUpdateAdminPayload = Partial<Omit<IAdmin, 'id' | 'user' | 'email'>>;

const updateAdmin = async (id: string, payload: TUpdateAdminPayload) => {
  // Destructure only the fields we explicitly allow, ignoring any injected garbage
  const { name, contactNo, profileImg, permissions } = payload;

  // Build a clean payload without undefined keys
  const safePayload: Record<string, unknown> = {};
  if (name !== undefined) safePayload.name = name;
  if (contactNo !== undefined) safePayload.contactNo = contactNo;
  if (profileImg !== undefined) safePayload.profileImg = profileImg;
  if (permissions !== undefined) safePayload.permissions = permissions;

  const result = await Admin.findOneAndUpdate({ id }, safePayload, {
    new: true,
    runValidators: true,
  });

  if (!result) throw new AppError('Staff member not found', httpStatus.NOT_FOUND);
  return result;
};

export const AdminServices = {
  getAllAdmins,
  getSingleAdmin,
  updateAdmin,
};
