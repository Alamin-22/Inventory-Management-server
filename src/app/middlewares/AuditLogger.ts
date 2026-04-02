/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { AuditLogModel } from '../modules/AuditLog/AuditLog.model';

/**
 * THE SECURITY CAMERA: Captures all system mutations by staff members.
 * Handles IP tracking, sensitive data masking, and resource identification.
 */
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  // 1. Only track mutations (Create, Update, Delete)
  const mutationMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  if (!mutationMethods.includes(req.method)) return next();

  // 2. Listen for the response to finish before saving the log
  res.on('finish', async () => {
    // on this IMS, any authenticated user is a staff member
    if (req.user) {
      try {
        // 3. Sanitize Payload (Recursive Masking)
        const sanitizedPayload = req.body ? JSON.parse(JSON.stringify(req.body)) : {};
        const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'token', 'refreshToken'];

        const maskSensitiveData = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const key in obj) {
            if (sensitiveFields.includes(key)) {
              obj[key] = '********';
            } else if (typeof obj[key] === 'object') {
              maskSensitiveData(obj[key]);
            }
          }
        };
        maskSensitiveData(sanitizedPayload);

        // Capture Real IP (Handles Nginx/Cloudflare/Local)
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || 'unknown';

        //  Identify Resource (e.g., /api/v1/products -> "products")
        const pathSegments = req.originalUrl.split('?')[0].split('/');
        // Usually, the resource is the 4th segment in /api/v1/resource
        const resource = pathSegments[3] || 'system';

        // 6. Save to Database
        await AuditLogModel.create({
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
          action: `${req.method} ${req.originalUrl}`,
          resource: resource,
          payload: sanitizedPayload,
          status: res.statusCode,
          ip: ip,
          userAgent: req.headers['user-agent'] || 'unknown',
        });
      } catch (err) {
        console.error('CRITICAL: Audit Logging Failed =>', err);
      }
    }
  });

  next();
};
