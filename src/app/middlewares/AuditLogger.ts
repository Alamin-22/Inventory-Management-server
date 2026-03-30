/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuditLogModel } from '@app/modules/AuditLog/AuditLog.model';
import { Request, Response, NextFunction } from 'express';

export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const mutationMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  if (!mutationMethods.includes(req.method)) return next();

  res.on('finish', async () => {
    if (req.user && req.user.role !== 'customer') {
      try {
        const AuditLog = getAuditLogModel(req.dbConnection!);

        const sanitizedPayload = JSON.parse(JSON.stringify(req.body));

        const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'verificationToken'];

        const maskSensitiveData = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;

          for (const key in obj) {
            if (sensitiveFields.includes(key)) {
              obj[key] = '********'; // Mask it
            } else if (typeof obj[key] === 'object') {
              maskSensitiveData(obj[key]); // Go deeper
            }
          }
        };

        maskSensitiveData(sanitizedPayload);

        await AuditLog.create({
          adminId: req.user.userId,
          email: req.user.email,
          role: req.user.role,
          action: `${req.method} ${req.originalUrl}`,
          resource: req.baseUrl.split('/')[3] || 'system',
          payload: sanitizedPayload,
          status: res.statusCode,
          storePreference: req.brand,
          ip: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent'],
        });
      } catch (err) {
        console.error('Audit Log Error:', err);
      }
    }
  });
  next();
};
