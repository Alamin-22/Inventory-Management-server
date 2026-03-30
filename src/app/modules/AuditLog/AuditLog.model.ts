import { Schema, Connection, Model } from 'mongoose';
import { TAuditLog } from './AuditLog.interface';
import { storePreferenceConfig } from '../Order/Order.model';

const auditLogSchema = new Schema<TAuditLog>(
  {
    adminId: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    status: { type: Number, required: true },
    storePreference: storePreferenceConfig,
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: 1 }, { expires: '60d' });

export const getAuditLogModel = (connection: Connection): Model<TAuditLog> => {
  return connection.models.AuditLog || connection.model<TAuditLog>('AuditLog', auditLogSchema);
};
