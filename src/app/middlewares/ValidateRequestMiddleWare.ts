import { catchAsync } from '@utils/catchAsync';
import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';

const ValidateRequestMiddleWare = (schema: ZodTypeAny) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body,
      cookies: req.cookies,
    });
    next();
  });
};

export default ValidateRequestMiddleWare;
