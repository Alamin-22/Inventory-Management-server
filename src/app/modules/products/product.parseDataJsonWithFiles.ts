/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import { hasOwn } from './product.utils';

// eslint-disable-next-line no-undef
type MulterFile = Express.Multer.File;

class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

type AnyObj = Record<string, any>;

export const parseDataJsonWithFiles = (req: Request, _res: Response, next: NextFunction) => {
  // STRICT: frontend must send `data` as a JSON string field in multipart
  if (typeof (req.body as any)?.data !== 'string') {
    return next(new BadRequestError('Missing body.data JSON field'));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse((req.body as any).data);
  } catch {
    return next(new BadRequestError('Invalid JSON in body.data'));
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return next(new BadRequestError('body.data must be a JSON object'));
  }

  req.body = parsed as AnyObj;

  const files = (req.files ?? []) as MulterFile[];

  // Creating empty arrays breaks PATCH semantics (it makes "images: []" look intentional). [file:16]

  for (const f of files) {
    if (f.fieldname === 'images') {
      if (!Array.isArray((req.body as AnyObj).images)) (req.body as AnyObj).images = [];
      (req.body as AnyObj).images.push(f);
      continue;
    }

    // Variant image: fieldname="variants[0][image]"
    const m = f.fieldname.match(/^variants\[(\d+)\]\[image\]$/);
    if (m) {
      const idx = Number(m[1]);
      if (!Number.isInteger(idx) || idx < 0) continue;

      if (!Array.isArray((req.body as AnyObj).variants)) (req.body as AnyObj).variants = [];

      while ((req.body as AnyObj).variants.length <= idx) (req.body as AnyObj).variants.push({});

      if (
        !(req.body as AnyObj).variants[idx] ||
        typeof (req.body as AnyObj).variants[idx] !== 'object' ||
        Array.isArray((req.body as AnyObj).variants[idx])
      ) {
        (req.body as AnyObj).variants[idx] = {};
      }

      (req.body as AnyObj).variants[idx].image = f;
      continue;
    }
  }

  // Optional hardening: if JSON explicitly included images/variants, ensure they are arrays

  if (hasOwn(req.body, 'images') && (req.body as AnyObj).images !== undefined) {
    if (!Array.isArray((req.body as AnyObj).images)) {
      return next(new BadRequestError('body.data.images must be an array when provided'));
    }
  }

  if (hasOwn(req.body, 'variants') && (req.body as AnyObj).variants !== undefined) {
    if (!Array.isArray((req.body as AnyObj).variants)) {
      return next(new BadRequestError('body.data.variants must be an array when provided'));
    }
  }

  next();
};
