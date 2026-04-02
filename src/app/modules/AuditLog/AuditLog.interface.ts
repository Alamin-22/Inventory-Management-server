/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  email: string;
  role: string;
  action: string;
  resource: string; // e.g., "transactions", "products"
  payload: any; // Sanitized req.body
  status: number; // HTTP Response code (200, 400, 500)
  ip: string;
  userAgent: string;
  createdAt: Date;
}
