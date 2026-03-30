import { JwtPayload } from 'jsonwebtoken';

export interface IJwtPayload extends JwtPayload {
  userId?: string;
  email?: string;
  role?: string;
  permissions?: string[];
}
