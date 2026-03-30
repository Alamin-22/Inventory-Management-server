import { Schema, Connection, Model } from 'mongoose';

interface ICounter {
  _id: string; // e.g., 'customer_id', 'admin_id'
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const getCounterModel = (connection: Connection) => {
  if (connection.models.Counter) {
    return connection.models.Counter as Model<ICounter>;
  }
  return connection.model<ICounter>('Counter', counterSchema);
};
