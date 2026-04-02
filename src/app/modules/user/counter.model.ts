import mongoose, { Schema } from 'mongoose';

interface ICounter {
  _id: string; // e.g., 'customer_id', 'admin_id'
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);
