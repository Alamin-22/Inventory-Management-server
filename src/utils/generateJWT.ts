import { IJwtPayload } from '@shared/type/jwtPayload';
import jwt from 'jsonwebtoken';

type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y';
export interface SignOptions {
  expiresIn?: number | `${number}${TimeUnit}`;
}

export const generateJWT = (jwtPayload: IJwtPayload, secret: string, expiresIn: SignOptions['expiresIn']) => {
  return jwt.sign(jwtPayload, secret, {
    expiresIn,
  });
};
