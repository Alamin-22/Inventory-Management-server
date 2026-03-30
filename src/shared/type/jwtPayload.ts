import { JwtPayload } from 'jsonwebtoken';

export interface IJwtPayload extends JwtPayload {
  userId?: string; // user._id not user.id
  email?: string;
  role?: string;
  cartId?: string;
  permissions?: string[];
}
