import { Connection, Model, Schema } from 'mongoose';
import { ISharedCounter } from './SharedCounter.interface';

export type TSharedCounterModel = Model<ISharedCounter>;

const SharedCounterSchema = new Schema<ISharedCounter>(
  {
    storePreference: { type: String, required: true, enum: ['bringByAir', 'pandaBD'], index: true },
    key: { type: String, required: true, index: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

// One counter doc per (storePreference, key)
SharedCounterSchema.index({ storePreference: 1, key: 1 }, { unique: true });

export const getSharedCounterModel = (connection: Connection): TSharedCounterModel => {
  return (
    (connection.models.SharedCounter as TSharedCounterModel) ||
    connection.model<ISharedCounter>('SharedCounter', SharedCounterSchema)
  );
};
