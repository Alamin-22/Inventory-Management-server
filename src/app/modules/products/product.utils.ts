/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendMediaToCloudinary } from '@utils/sendMediaToCloudinary';
import { slugify } from '@utils/slugGenerator';
import { IProductImage, IProductVariant } from './product.interface';
import { Connection, Types } from 'mongoose';
import { getCategoryModel } from '../Category/Category.model';

export const buildProductSlug = (title: string) => slugify(title);

export const computeDefaults = (variants: IProductVariant[] = [], images: IProductImage[] = []) => {
  // Safe Fallback: Protect against empty arrays
  const preferred = variants?.find((v) => v.fulfillmentType === 'READY_TO_SHIP') ?? variants?.[0];

  // Safe Fallback: Optional chaining prevents server crash if gallery is empty
  const defaultImage = preferred?.image?.url || images?.[0]?.url || undefined;
  const defaultPriceBDT = preferred?.priceBDT ?? 0;
  const defaultVariantSku = preferred?.sku || undefined;

  return { defaultImage, defaultPriceBDT, defaultVariantSku };
};

type UploadKey = string;

export const addFileToQueue = (fileOrObj: any, map: Map<UploadKey, any>) => {
  if (fileOrObj && typeof fileOrObj === 'object' && fileOrObj.path) {
    // Keying by original name, size, and type creates a reliable fingerprint
    const key = `${fileOrObj.originalname}-${fileOrObj.size}-${fileOrObj.mimetype}`;
    map.set(key, fileOrObj);
    return key;
  }
  return null;
};

export const getImageFromFile = (fileOrObj: any, urlMap: Map<UploadKey, IProductImage>): IProductImage | undefined => {
  if (!fileOrObj) return undefined;

  // Case 1: Existing image from Cloudinary (Already has url/publicId)
  if (fileOrObj.url && fileOrObj.publicId) return fileOrObj as IProductImage;

  // Case 2: Newly uploaded file from Multer
  if (typeof fileOrObj === 'object' && fileOrObj.path) {
    const key = `${fileOrObj.originalname}-${fileOrObj.size}-${fileOrObj.mimetype}`;
    return urlMap.get(key);
  }
  return undefined;
};

export const uploadUniqueFiles = async (
  brand: string,
  slug: string,
  uniqueFilesToUpload: Map<UploadKey, any>,
  folderSuffix = 'products',
) => {
  const folderPath = `${brand.toUpperCase()}/${folderSuffix}`;

  const uploadPromises = Array.from(uniqueFilesToUpload.entries()).map(async ([fileKey, file]) => {
    // Clean media name: Slug + Original Name (no ext) + Timestamp
    const originalNameClean = file.originalname?.split?.('.')?.[0]?.replace(/[^a-zA-Z0-9]/g, '-') ?? 'media';
    const mediaName = `${slug}-${originalNameClean}-${Date.now()}`;

    const uploaded = await sendMediaToCloudinary(mediaName, file.path, folderPath);

    return {
      fileKey,
      imageData: { url: uploaded.secure_url, publicId: uploaded.public_id } as IProductImage,
    };
  });

  const uploadResults = await Promise.all(uploadPromises);

  const urlMap = new Map<UploadKey, IProductImage>();
  uploadResults.forEach((r) => urlMap.set(r.fileKey, r.imageData));

  return urlMap;
};

// Helper: determine if a publicId is still referenced in a product object
export const isPublicIdReferenced = (prod: any, publicId: string) => {
  if (!publicId) return false;

  const inGallery = (prod.images ?? []).some((img: any) => img?.publicId === publicId);
  if (inGallery) return true;

  const inVariants = (prod.variants ?? []).some((v: any) => v?.image?.publicId === publicId);
  return inVariants;
};

// ****** for deleting image from the product description***************

//  Extract all data-id="..." from an HTML string
export const extractPublicIdsFromHtml = (html: string | undefined | null): string[] => {
  if (!html) return [];
  const ids: string[] = [];
  // Regex to capture the value inside data-id="..."
  const regex = /data-id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) ids.push(match[1]);
  }
  return ids;
};

export const hasOwn = (obj: unknown, key: string) =>
  !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);

export const toId = (v: any): string | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;

  // Mongoose ObjectId
  if (v instanceof Types.ObjectId) return v.toString();

  // Populated document-like { _id }
  if (typeof v === 'object' && v._id) return toId(v._id);

  // Fallback for bson ObjectId-like
  if (typeof v?.toString === 'function') {
    const s = v.toString();
    return typeof s === 'string' ? s : undefined;
  }

  return undefined;
};

export const mapIds = (arr: any): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => toId(x)).filter(Boolean) as string[];
};

export const sanitizeForValidation = (updatedObj: any) => ({
  ...updatedObj,
  category: toId(updatedObj.category),
  verifiedBrandId: updatedObj.verifiedBrandId ? toId(updatedObj.verifiedBrandId) : null,
  badges: mapIds(updatedObj.badges),
  frequentlyBoughtTogether: mapIds(updatedObj.frequentlyBoughtTogether),
});

// --- HELPER FUNCTION ---
export const getExpandedCategoryIds = async (connection: Connection, categoryQuery: string) => {
  if (!categoryQuery) return undefined;

  // 1. Handle comma-separated strings
  const categoryIds = categoryQuery.split(',').map((id) => id.trim());
  const CategoryModel = getCategoryModel(connection);

  // 2. Fetch all direct subcategories
  const subCategories = await CategoryModel.find({ parentCategory: { $in: categoryIds } })
    .select('_id')
    .lean();

  // 3. CRITICAL FIX: Map them to pure Strings so transformOperators doesn't destroy them!
  const subCategoryIds = subCategories.map((c) => c._id.toString());

  // 4. Combine and deduplicate as plain strings
  const allEligibleIds = [...new Set([...categoryIds, ...subCategoryIds])];

  // 5. Return the exact object structure your QueryBuilder's post-processor expects
  return { in: allEligibleIds };
};
