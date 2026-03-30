import { config } from '@config/env';
import { IJwtPayload } from '@shared/type/jwtPayload';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { TBrand } from './auth.interface';

type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y';
export interface SignOptions {
  expiresIn?: number | `${number}${TimeUnit}`;
}

export const createToken = (jwtPayload: IJwtPayload, secret: string, expiresIn: SignOptions['expiresIn']) => {
  return jwt.sign(jwtPayload, secret, {
    expiresIn,
  });
};

export const VerifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret as string) as JwtPayload;
};

export const generateVerificationLink = (userId: string, email: string, storePreference: TBrand) => {
  const token = createToken({ userId, email, role: 'customer' }, config.accessTokenSecret as string, '10m');

  return `${config.client[storePreference].url}/login?token=${token}`;
};
