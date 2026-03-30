import { TBrand } from '../auth/auth.interface';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type TAuditLog = {
  adminId: string;
  email: string;
  role: string;
  action: string; // e.g., "PATCH /api/v1/products/123"
  resource: string; // e.g., "products", "orders"
  payload: any; // The data sent in req.body
  status: number; // 200, 201, 403, 500
  storePreference: TBrand;
  ip?: string;
  userAgent?: string;
};
