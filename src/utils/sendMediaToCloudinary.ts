import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from '@config/env';
import multer from 'multer';
import fs from 'fs';

cloudinary.config({
  cloud_name: config.cloudinaryConfig.cloud_name,
  api_key: config.cloudinaryConfig.api_key,
  api_secret: config.cloudinaryConfig.api_access_secret,
});

// Utility to optimize Cloudinary URLs automatically
const optimizeCloudinaryUrl = (url: string): string => {
  if (!url || !url.includes('/upload/')) return url;
  // Insert optimization parameters after '/upload/'
  return url.replace('/upload/', '/upload/f_auto,q_auto,dpr_auto/');
};

const deleteLocalFile = (path: string) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.error('Error deleting local file:', err);
    } else {
      console.log('Local file deleted successfully');
    }
  });
};

export const sendMediaToCloudinary = async (
  mediaName: string,
  path: string,
  folder: string,
): Promise<UploadApiResponse> => {
  try {
    // Upload media (image or video)
    const uploadResult = await cloudinary.uploader.upload(path, {
      public_id: mediaName,
      folder: folder,
      resource_type: 'auto', // Detects image vs video automatically
    });

    // Delete local file after upload
    deleteLocalFile(path);

    // Automatically optimize the URLs stored in the result
    const optimizedSecureUrl = optimizeCloudinaryUrl(uploadResult.secure_url);
    const optimizedUrl = uploadResult.url ? optimizeCloudinaryUrl(uploadResult.url) : '';

    // Return the upload result with optimized URL for front-end use
    return {
      ...uploadResult,
      secure_url: optimizedSecureUrl,
      url: optimizedUrl,
    } as UploadApiResponse;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    // Ensure local file is deleted even if upload fails to prevent server clutter
    deleteLocalFile(path);
    throw new Error('Failed to upload media to Cloudinary');
  }
};

export const deleteFileFromCloudinary = async (publicId: string): Promise<boolean> => {
  if (!publicId) {
    console.log('No public_id provided, skipping deletion.');
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log(`Successfully deleted asset: ${publicId} from Cloudinary.`);
      return true;
    } else {
      console.warn(`Cloudinary deletion status for ${publicId}: ${result.result}`);
      return false;
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
};

export const duplicateImageFromUrl = async (imageUrl: string, folder: string): Promise<UploadApiResponse | null> => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: folder,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
    return result;
  } catch (error) {
    console.error('Cloudinary duplication error:', error);
    return null;
  }
};

export const purgeCloudinaryImages = async (images: { publicId: string }[]) => {
  if (!images || images.length === 0) return;

  console.log(`Cleaning up ${images.length} ghost assets from Cloudinary...`);
  const deletionPromises = images.map((img) => deleteFileFromCloudinary(img.publicId));

  // We use allSettled to ensure one failing delete doesn't stop the others
  await Promise.allSettled(deletionPromises);
};

// ---  MULTER CONFIG ---

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    // Ensure this folder exists in your project root or handle error if missing
    cb(null, process.cwd() + '/uploads');
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  },
});

export const upload = multer({ storage: storage });
