/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import fs from 'fs';

export const fileCleanupOnError = async (err: any, req: Request, _res: Response, next: NextFunction) => {
  // console.log('Error caught in cleanup middleware. Checking for files to delete...');

  // 1. Create a unified array of files to delete
  // eslint-disable-next-line no-undef
  let filesToDelete: Express.Multer.File[] = [];

  // Handle 'req.files' (upload.array / upload.fields)
  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToDelete = req.files;
    } else {
      // Handle upload.fields (object of arrays)
      Object.values(req.files).forEach((fileArray) => {
        filesToDelete.push(...fileArray);
      });
    }
  }

  // Handle 'req.file' (upload.single)
  if (req.file) {
    filesToDelete.push(req.file);
  }

  // 2. Delete files if any exist
  if (filesToDelete.length > 0) {
    console.log(`Found ${filesToDelete.length} files to clean up.`);

    const deletionPromises = filesToDelete.map((file) => {
      return fs.promises.unlink(file.path).catch((unlinkErr) => {
        // Ignore "ENOENT" (file not found) errors, as Cloudinary utils might have deleted it already
        if (unlinkErr.code !== 'ENOENT') {
          console.error(`Failed to delete file: ${file.path}`, unlinkErr);
        }
      });
    });

    await Promise.all(deletionPromises);
    console.log('File cleanup completed.');
  }

  next(err);
};
