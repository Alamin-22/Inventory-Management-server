import { JwtPayload } from 'jsonwebtoken';

export interface IJwtPayload extends JwtPayload {
  id: string;
  role: string;
  email: string;
  permissions: string[];
}
