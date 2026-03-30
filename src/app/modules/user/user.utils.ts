import { Connection } from 'mongoose';
import { USER_ROLE } from './user.constants';
import { getCounterModel } from './counter.model';

export const generateUserId = async (role: string, connection: Connection) => {
  let prefix = '';
  let counterId = '';

  switch (role) {
    case USER_ROLE.customer:
      prefix = 'C-';
      counterId = 'customer_id';
      break;
    case USER_ROLE.admin:
      prefix = 'A-';
      counterId = 'admin_id';
      break;
    case USER_ROLE.super_admin:
      prefix = 'SA-';
      counterId = 'super_admin_id';
      break;
    default:
      prefix = 'U-';
      counterId = 'user_id';
  }

  const CounterModel = getCounterModel(connection);

  const result = await CounterModel.findByIdAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  // Pad with zeros (e.g., 5 -> 00005)
  // Ensure result isn't null (upsert handles it, but TS might complain)
  const seqId = result ? result.seq : 1;
  const paddedSeq = seqId.toString().padStart(5, '0');

  return `${prefix}${paddedSeq}`;
};
