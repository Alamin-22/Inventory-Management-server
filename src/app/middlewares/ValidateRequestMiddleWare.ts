import { catchAsync } from '@utils/catchAsync';
import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';

// I am replacing the anyZodObject to ZodTypeAny , If any error arise for this then replace with the old one
const ValidateRequestMiddleWare = (schema: ZodTypeAny) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    //  validation using Zod and if everything alright then next will be proceed

    await schema.parseAsync({
      body: req.body,
      cookies: req.cookies,
    });
    next();
  });
};

export default ValidateRequestMiddleWare;
