import { IJwtPayload } from '@shared/type/jwtPayload';
import jwt, { JwtPayload } from 'jsonwebtoken';

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
