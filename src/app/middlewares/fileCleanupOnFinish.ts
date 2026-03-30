import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import 'multer';

// eslint-disable-next-line no-undef
type MulterFile = Express.Multer.File;

function collectMulterFiles(req: Request): MulterFile[] {
  const files: MulterFile[] = [];

  // upload.array() => req.files: MulterFile[]
  // upload.fields() => req.files: Record<string, MulterFile[]>
  // upload.any() => req.files: MulterFile[]
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...(req.files as MulterFile[]));
    } else {
      Object.values(req.files as Record<string, MulterFile[]>).forEach((arr) => files.push(...arr));
    }
  }

  // upload.single() => req.file
  if (req.file) files.push(req.file as MulterFile);

  return files;
}

async function safeUnlink(path: string) {
  try {
    await fs.promises.unlink(path);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // Ignore "already deleted"
    if (err?.code !== 'ENOENT') {
      console.error('fileCleanupOnFinish unlink failed:', path, err);
    }
  }
}

/**
 * Deletes multer disk files after the response is sent (finish)
 * or when the connection closes (close).
 *
 * Put it immediately after multer:
 * router.post("/x", upload.any(), fileCleanupOnFinish, ...middlewares, controller)
 */
export const fileCleanupOnFinish = (req: Request, res: Response, next: NextFunction) => {
  const files = collectMulterFiles(req);

  if (files.length === 0) return next();

  let ran = false;

  const cleanup = async () => {
    if (ran) return;
    ran = true;
    await Promise.all(files.map((f) => safeUnlink(f.path)));
  };

  // response successfully sent (covers success + early-return 4xx/401/403 etc)
  res.once('finish', () => void cleanup());

  // client disconnected / aborted
  res.once('close', () => void cleanup());

  next();
};
