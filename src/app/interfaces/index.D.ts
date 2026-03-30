import { JwtPayload } from 'jsonwebtoken';
import { Connection } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
      dbConnection: Connection;
      brand: 'bringByAir' | 'pandaBD';
    }
  }
}
