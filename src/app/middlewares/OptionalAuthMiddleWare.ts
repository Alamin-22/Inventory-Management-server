import { config } from '@config/env';
import { NextFunction, Response } from 'express';
import { Request } from 'express-serve-static-core';
import jwt, { JwtPayload } from 'jsonwebtoken';

export function OptionalAuthMiddleWare(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization;

  if (!token) {
    console.log('[optionalAuth] no Authorization header, continuing as guest');
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret as string) as JwtPayload;
    console.log('[optionalAuth] token valid, decoded =', decoded);
    req.user = decoded as JwtPayload;
  } catch (err) {
    console.log('[optionalAuth] token invalid or expired, continuing as guest:', err);
  }

  return next();
}
