import { Schema, model } from 'mongoose';
import { IAuditLog } from './AuditLog.interface';

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    status: { type: Number, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
  },
  { timestamps: true },
);

// Auto-cleanup: Logs older than 60 days will be removed automatically by MongoDB
auditLogSchema.index({ createdAt: 1 }, { expires: '60d' });
auditLogSchema.index({ email: 1 });
auditLogSchema.index({ resource: 1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);
