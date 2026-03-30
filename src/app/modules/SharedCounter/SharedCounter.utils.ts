import { Connection } from 'mongoose';
import { TBrand } from '@app/modules/auth/auth.interface';
import { getSharedCounterModel } from './SharedCounter.model';

export const getNextSequence = async (params: {
  connection: Connection;
  storePreference: TBrand;
  key: string; // e.g. "heroStage.displayOrder"
}) => {
  const Counter = getSharedCounterModel(params.connection);

  const doc = await Counter.findOneAndUpdate(
    { storePreference: params.storePreference, key: params.key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();

  return doc!.seq;
};
