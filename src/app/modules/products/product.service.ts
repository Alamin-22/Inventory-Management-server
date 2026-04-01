/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { startSession, Types } from 'mongoose';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { AppError } from '@app/classes/AppError';
import { IProduct, IProductImage } from './product.interface';
import {
  addFileToQueue,
  buildProductSlug,
  computeDefaults,
  extractPublicIdsFromHtml,
  getExpandedCategoryIds,
  getImageFromFile,
  hasOwn,
  isPublicIdReferenced,
  sanitizeForValidation,
  uploadUniqueFiles,
} from './product.utils';
import { PRODUCT_STATUS, productSearchableFields } from './product.constants';
import { productValidationSchemas } from './product.validation';
import { deleteFileFromCloudinary } from '@utils/sendMediaToCloudinary';
import { ProductModel } from './product.model';
import { Category } from '../Category/Category.model';

const createProductIntoDB = async (payload: IProduct): Promise<IProduct> => {
  const data: any = { ...payload };

  const slug = data.slug || buildProductSlug(data.title);

  const existingProduct = await ProductModel.findOne({ slug }).select('_id').lean();
  if (existingProduct) {
    throw new AppError(
      `A product with the title "${data.title}" already exists. Please use a unique title.`,
      httpStatus.CONFLICT,
    );
  }

  data.slug = slug;
  data.isDeleted = false;
  data.isPublished = data.isPublished ?? false;
  data.status = data.status ?? PRODUCT_STATUS.Draft;

  // Collect unique files from BOTH gallery and variants
  const uniqueFilesToUpload = new Map<string, any>();
  (data.images ?? []).forEach((img: any) => addFileToQueue(img, uniqueFilesToUpload));
  (data.variants ?? []).forEach((v: any) => addFileToQueue(v?.image, uniqueFilesToUpload));

  // Upload unique files once
  const urlMap =
    uniqueFilesToUpload.size > 0
      ? // 2. Removed storePreference from the upload utility call
        await uploadUniqueFiles(slug, uniqueFilesToUpload, 'products')
      : new Map();

  // Re-assign Cloudinary URLs back to payload
  const processedGallery: IProductImage[] = [];

  // Process Main Gallery Images
  (data.images ?? []).forEach((img: any) => {
    const imgData = getImageFromFile(img, urlMap);
    if (imgData) processedGallery.push(imgData);
  });

  // Process Variant Images
  (data.variants ?? []).forEach((v: any) => {
    const imgData = getImageFromFile(v?.image, urlMap);

    if (imgData) {
      v.image = imgData;
      // Add variant image to the main gallery too!
      processedGallery.push(imgData);
    } else if (v?.image && typeof v.image === 'object' && v.image.path) {
      // If a file was provided but upload mapping failed, drop it
      v.image = undefined;
    }
  });

  // Deduplicate gallery by publicId
  // This ensures that if an image was in both 'images' and 'variants', it only appears once
  const uniqueGalleryImages = Array.from(new Map(processedGallery.map((i) => [i.publicId, i])).values());

  // Assign the combined list to the main images array
  data.images = uniqueGalleryImages;

  if (data.isPublished === true) {
    data.status = PRODUCT_STATUS.Active;
  }

  // If publishing now, enforce publishable rules
  if (data.isPublished === true) {
    productValidationSchemas.publishableProductZodSchema.shape.body.parse({
      ...data,
      category: (data.category as any)?.toString?.() ?? data.category,
      // 3. Updated to 'brand' and removed storefront bloat (badges, frequentlyBoughtTogether)
      brand: (data.brand as any)?.toString?.() ?? data.brand ?? null,
    });
  }

  // Compute defaults
  const { defaultImage, defaultPriceBDT, defaultVariantSku } = computeDefaults(data.variants, data.images);

  if (defaultImage) data.defaultImage = defaultImage;
  else delete data.defaultImage;

  data.defaultPriceBDT = defaultPriceBDT;

  if (defaultVariantSku) data.defaultVariantSku = defaultVariantSku;
  else delete data.defaultVariantSku;

  try {
    // 4. Use global Product model
    const created = await ProductModel.create(data);
    return created;
  } catch (error: any) {
    if (error?.code === 11000) {
      const key = error?.keyValue ? Object.keys(error.keyValue)[0] : '';
      if (key === 'slug') {
        throw new AppError('A product with this slug already exists.', httpStatus.CONFLICT);
      }
      if (key?.includes('variants') || key === 'variants.sku') {
        throw new AppError('A variant with this SKU already exists.', httpStatus.CONFLICT);
      }
      throw new AppError('Duplicate key error: a unique field already exists.', httpStatus.CONFLICT);
    }
    throw error;
  }
};

// for admin panel
const getAllProductsForDashboardFromDB = async (query: Record<string, any>) => {
  const queryObj = { ...query };

  if (queryObj.category) {
    queryObj.category = await getExpandedCategoryIds(queryObj.category);
  }

  const productQuery = new QueryBuilder<IProduct>(ProductModel, {
    ...queryObj,
    withDeleted: false,
  })
    .search(productSearchableFields)
    .filter()
    .sort()
    .populate({
      from: 'categories',
      localField: 'category',
      foreignField: '_id',
      as: 'category',
      unwind: true,
      pipeline: [{ $project: { name: 1, slug: 1 } }],
    })
    .populate({
      from: 'brands',
      localField: 'brand',
      foreignField: '_id',
      as: 'brand',
      unwind: true,
      pipeline: [{ $project: { name: 1, slug: 1 } }],
    })
    .paginate()
    .select('title,slug,defaultImage,category,brand,variants,status,isPublished');

  const result = await productQuery.exec();
  const meta = await productQuery.getQueryMeta();

  return { meta, result };
};

const getAllPublishedProductsFromDB = async (query: Record<string, any>) => {
  const queryObj = { ...query };

  // 1. Handle Category Slug Fast-fail
  if (queryObj.categorySlug) {
    const categoryDoc = await Category.findOne({ slug: queryObj.categorySlug }).select('_id').lean();

    // Fast-fail: If slug is invalid, return empty array instantly
    if (!categoryDoc) {
      return {
        meta: { total: 0, page: Number(queryObj.page) || 1, limit: Number(queryObj.limit) || 24, totalPages: 0 },
        result: [],
      };
    }

    queryObj.category = categoryDoc._id.toString();
    delete queryObj.categorySlug;
  }

  if (queryObj.category) {
    queryObj.category = await getExpandedCategoryIds(queryObj.category);
  }

  const productQuery = new QueryBuilder<IProduct>(ProductModel, {
    ...queryObj,
    isPublished: true,
    status: { $in: [PRODUCT_STATUS.Active, PRODUCT_STATUS.Out_Of_Stock] },
  })
    .search(productSearchableFields)
    .filter()
    .sort()
    .paginate()
    // SHAPE STAGE 1: Extract default variant
    .addStage({
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        defaultImage: 1,
        defaultPriceBDT: 1,
        createdAt: 1,
        status: 1,
        defaultVariant: {
          $arrayElemAt: [
            {
              $filter: {
                input: { $ifNull: ['$variants', []] },
                as: 'v',
                cond: { $eq: ['$$v.sku', '$defaultVariantSku'] },
              },
            },
            0,
          ],
        },
      },
    })
    // SHAPE STAGE 2: Format exactly to a lean inventory list
    .addStage({
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        image: '$defaultImage',
        price: '$defaultPriceBDT',
        oldPrice: '$defaultVariant.oldPriceBDT',
        discountPercentage: '$defaultVariant.discountPercentage',
        createdAt: 1,
        status: 1,
      },
    });

  const result = await productQuery.exec();
  const meta = await productQuery.getQueryMeta();

  return { meta, result };
};

const getSingleProductFromDB = async (identifier: string) => {
  const isObjectId = Types.ObjectId.isValid(identifier);

  // Admin/IMS (ID): Fetch strictly by ID, regardless of publish status.
  // Public (Slug): Fetch by slug, MUST be published and not deleted.
  const findQuery = isObjectId
    ? { _id: new Types.ObjectId(identifier) }
    : { slug: identifier, isDeleted: { $ne: true }, isPublished: true };

  // Strip out internal admin fields to save bandwidth for public requests.
  // Removed '-searchHitCount' because it does not exist in your provided schema.
  const projection = isObjectId ? '' : '-adminNotes -__v -createdAt -updatedAt';

  const productQuery = ProductModel.findOne(findQuery)
    .select(projection)
    .populate({
      path: 'category',
      select: 'name slug parentCategory',
      populate: {
        path: 'parentCategory',
        select: 'name slug',
      },
    })
    .populate({
      path: 'brand',
      select: 'name slug logo',
    });

  const product = await productQuery.lean();

  if (!product) return null;

  // Return the lightweight, raw product directly for the IMS
  return product;
};

const softDeleteProductFromDB = async (id: string) => {
  const updated = await ProductModel.findByIdAndUpdate(
    id,
    { isDeleted: true, isPublished: false, status: PRODUCT_STATUS.Deleted },
    { new: true },
  );
  if (!updated) throw new AppError('Product Not Found To Delete', httpStatus.NOT_FOUND);
  return updated;
};

const restoreArchivedProductIntoDB = async (id: string) => {
  const product = await ProductModel.findOne({ _id: id, isDeleted: true }).setOptions({ withDeleted: true });
  if (!product) throw new AppError('Archived product not found.', httpStatus.NOT_FOUND);

  product.isDeleted = false;
  product.status = PRODUCT_STATUS.Draft;
  await product.save();

  return product;
};

const getArchivedProductsFromDB = async (query: Record<string, any>) => {
  const archivedQuery = new QueryBuilder<IProduct>(ProductModel, {
    ...query,
    isDeleted: true,
    withDeleted: true,
  });

  const result = await archivedQuery
    .search(productSearchableFields)
    .filter()
    .sort()
    .populate({
      from: 'categories',
      localField: 'category',
      foreignField: '_id',
      as: 'category',
      unwind: true,
      pipeline: [{ $project: { name: 1, slug: 1 } }],
    })
    .populate({
      from: 'brands',
      localField: 'brand',
      foreignField: '_id',
      as: 'brand',
      unwind: true,
      pipeline: [{ $project: { name: 1, slug: 1 } }],
    })
    .paginate()
    .limitFields()
    .exec();

  const meta = await archivedQuery.getQueryMeta();
  return { meta, result };
};

const deleteProductsPermanentlyFromDB = async (productIds: string[]) => {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new AppError('productIds is required', httpStatus.BAD_REQUEST);
  }

  const validIds = productIds.filter((id) => Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new AppError('No valid productIds provided', httpStatus.BAD_REQUEST);
  }

  const ids = validIds.map((id) => new Types.ObjectId(id));

  const productsToDelete = await ProductModel.find({
    _id: { $in: ids },
    isDeleted: true,
  })
    .setOptions({ withDeleted: true })
    .select('images.publicId variants.image.publicId')
    .lean();

  if (!productsToDelete.length) {
    throw new AppError(
      'No matching archived products found to delete. (Active products cannot be permanently deleted)',
      httpStatus.NOT_FOUND,
    );
  }

  // Extract Cloudinary Public IDs from both main images array and variant subdocuments
  const publicIdsToDelete: string[] = [];
  productsToDelete.forEach((product: any) => {
    product.images?.forEach((img: any) => {
      if (img?.publicId) publicIdsToDelete.push(img.publicId);
    });
    product.variants?.forEach((variant: any) => {
      if (variant?.image?.publicId) publicIdsToDelete.push(variant.image.publicId);
    });
  });

  const uniquePublicIds = [...new Set(publicIdsToDelete)].filter(Boolean);

  const result = await ProductModel.deleteMany({
    _id: { $in: ids },
    isDeleted: true,
  });

  if (!result?.deletedCount || result.deletedCount === 0) {
    throw new AppError('No archived products were deleted (already deleted or not found).', httpStatus.NOT_FOUND);
  }

  // Cleanup Cloudinary (Fire-and-forget so the user isn't kept waiting)
  if (uniquePublicIds.length > 0) {
    Promise.allSettled(uniquePublicIds.map((pid) => deleteFileFromCloudinary(pid))).catch((e) => console.error(e));
  }

  return result;
};

const updateProductIntoDB = async (id: string, payload: Partial<IProduct>) => {
  const session = await startSession();

  try {
    await session.withTransaction(async () => {
      const product = await ProductModel.findById(id).session(session);

      if (!product) throw new AppError('Product Not Found!', httpStatus.NOT_FOUND);

      const current = product.toObject({ flattenMaps: true }) as any;

      const publicIdsToDelete: string[] = [];
      const updateQuery: Record<string, any> = { $set: {} };

      const nextSlug = payload.title ? buildProductSlug(payload.title) : current.slug;

      if (payload.title) {
        updateQuery.$set.slug = nextSlug;

        const exists = await ProductModel.findOne({
          slug: nextSlug,
          _id: { $ne: new Types.ObjectId(id) },
        })
          .select('_id')
          .lean()
          .session(session);

        if (exists) throw new AppError('Conflict: slug already exists.', httpStatus.CONFLICT);
      }

      // Upload queue (only if keys provided)
      const imagesProvided = hasOwn(payload, 'images');
      const variantsProvided = hasOwn(payload, 'variants');

      const uniqueFilesToUpload = new Map<string, any>();

      if (imagesProvided && Array.isArray((payload as any).images)) {
        (payload as any).images.forEach((img: any) => addFileToQueue(img, uniqueFilesToUpload));
      }

      if (variantsProvided && Array.isArray((payload as any).variants)) {
        (payload as any).variants.forEach((v: any) => addFileToQueue(v?.image, uniqueFilesToUpload));
      }

      const urlMap =
        uniqueFilesToUpload.size > 0
          ? await uploadUniqueFiles(nextSlug, uniqueFilesToUpload, 'products')
          : new Map<string, IProductImage>();

      // Gallery handling (robust PATCH semantics)
      //    - If client did NOT send `images`, we must not touch gallery.
      //    - If client DID send `images` (even empty), treat as full replace.
      let candidateGallery: IProductImage[] = Array.isArray(current.images) ? [...current.images] : [];
      let isGalleryModified = false;

      if (imagesProvided) {
        const incomingImages = (payload as any).images;

        if (!Array.isArray(incomingImages)) {
          throw new AppError('Invalid payload: images must be an array when provided.', httpStatus.BAD_REQUEST);
        }

        candidateGallery = [];
        for (const img of incomingImages) {
          const imgData = getImageFromFile(img, urlMap);
          if (imgData) candidateGallery.push(imgData);
        }

        isGalleryModified = true;
        delete (payload as any).images;
      }

      //  VARIANT SYNC (NOW POWERED BY IMMUTABLE _id)
      const incomingVariantPatches = variantsProvided ? ((payload as any).variants as any) : undefined;
      if (variantsProvided) delete (payload as any).variants;

      if (variantsProvided) {
        if (!Array.isArray(incomingVariantPatches)) {
          throw new AppError('Invalid payload: variants must be an array when provided.', httpStatus.BAD_REQUEST);
        }

        if (incomingVariantPatches.length === 0) {
          throw new AppError('variants cannot be an empty array.', httpStatus.BAD_REQUEST);
        }

        // 1. Check for Duplicate SKUs within the incoming payload to prevent user errors
        const incomingSkus = incomingVariantPatches.map((v: any) => v?.sku).filter(Boolean);
        if (new Set(incomingSkus).size !== incomingSkus.length) {
          throw new AppError('Duplicate SKU found in variants payload.', httpStatus.BAD_REQUEST);
        }

        // 2. Build ID Sets (instead of SKU sets)
        const existingIdSet = new Set((current.variants ?? []).map((v: any) => v._id?.toString()));
        const incomingIdSet = new Set(incomingVariantPatches.map((v: any) => v?._id?.toString()).filter(Boolean));

        // 3. Remove zombies (Variants that exist in DB but NOT in incoming payload by _id)
        const idsToDelete = [...existingIdSet].filter((vid) => !incomingIdSet.has(vid));
        if (idsToDelete.length > 0) {
          await ProductModel.updateOne(
            { _id: id },
            { $pull: { variants: { _id: { $in: idsToDelete } } } },
            { session },
          );

          const variantsToDelete = (current.variants ?? []).filter((v: any) => idsToDelete.includes(v._id?.toString()));
          for (const v of variantsToDelete) {
            if (v.image?.publicId) publicIdsToDelete.push(v.image.publicId);
          }
        }

        // 4. Split update vs insert using _id
        const existingUpdates = incomingVariantPatches.filter((v: any) => v._id && existingIdSet.has(v._id.toString()));
        const newVariants = incomingVariantPatches.filter((v: any) => !v._id || !existingIdSet.has(v._id.toString()));

        const processVariantImage = (v: any) => {
          const imgData = getImageFromFile(v?.image, urlMap);

          if (imgData) {
            v.image = imgData;
            candidateGallery.push(imgData);
            isGalleryModified = true;
          } else if (v?.image && typeof v.image === 'object' && (v.image as any).path) {
            v.image = undefined;
          }
          return v;
        };

        const allowedKeys = new Set([
          'name',
          'sku',
          'selectedOptions',
          'priceBDT',
          'oldPriceBDT',
          'discountPercentage',
          'inventory',
          'image',
        ]);

        const bulkOps = existingUpdates
          .map((v: any) => {
            processVariantImage(v);

            const updateFields: Record<string, any> = {};
            for (const [key, val] of Object.entries(v)) {
              if (allowedKeys.has(key) && val !== undefined) {
                updateFields[`variants.$.${key}`] = val;
              }
            }

            if (Object.keys(updateFields).length === 0) return null;

            return {
              updateOne: {
                filter: { _id: id, 'variants._id': v._id },
                update: { $set: updateFields },
              },
            };
          })
          .filter(Boolean);

        if (bulkOps.length) {
          await ProductModel.bulkWrite(bulkOps as any, { session, runValidators: true } as any);
        }

        if (newVariants.length) {
          newVariants.forEach(processVariantImage);
          await ProductModel.updateOne(
            { _id: id },
            { $push: { variants: { $each: newVariants } } },
            { session, runValidators: true },
          );
        }
      }

      // Finalize gallery update
      if (isGalleryModified) {
        const uniqueGallery = Array.from(new Map(candidateGallery.map((i) => [i.publicId, i])).values());
        updateQuery.$set.images = uniqueGallery;

        const newPublicIds = new Set(uniqueGallery.map((i) => i.publicId));
        (current.images ?? []).forEach((oldImg: any) => {
          if (oldImg?.publicId && !newPublicIds.has(oldImg.publicId)) publicIdsToDelete.push(oldImg.publicId);
        });
      }

      // Scalar updates
      if ((payload as any).seo) {
        Object.entries((payload as any).seo).forEach(([k, v]) => {
          if (v !== undefined) updateQuery.$set[`seo.${k}`] = v;
        });
        delete (payload as any).seo;
      }

      if ((payload as any).specifications) {
        Object.entries((payload as any).specifications).forEach(([k, v]) => {
          if (v !== undefined) updateQuery.$set[`specifications.${k}`] = v;
        });
        delete (payload as any).specifications;
      }

      const isPublishingNow = (payload as any).isPublished === true && !current.isPublished;
      if (isPublishingNow) {
        updateQuery.$set.status = PRODUCT_STATUS.Active;
        updateQuery.$set.isPublished = true;
        delete (payload as any).isPublished;
      }

      const isUnpublishingNow = (payload as any).isPublished === false && current.isPublished === true;
      if (isUnpublishingNow) {
        updateQuery.$set.isPublished = false;
        updateQuery.$set.status = PRODUCT_STATUS.Draft;
        delete (payload as any).isPublished;
      }

      if (typeof (payload as any).description === 'string') {
        const oldDescIds = extractPublicIdsFromHtml(current.description);
        const newDescIds = extractPublicIdsFromHtml((payload as any).description);
        const removedIds = oldDescIds.filter((pid) => !newDescIds.includes(pid));
        if (removedIds.length > 0) publicIdsToDelete.push(...removedIds);
      }

      Object.entries(payload as any).forEach(([k, v]) => {
        if (v !== undefined) updateQuery.$set[k] = v;
      });

      if (Object.keys(updateQuery.$set).length > 0) {
        await ProductModel.updateOne({ _id: id }, updateQuery, { session, runValidators: true });
      }

      // Reload, compute defaults, validate publish constraints, save
      const updatedProduct = await ProductModel.findById(id).session(session);

      if (!updatedProduct) throw new AppError('Verification failed during update.', 500);

      const updatedObj = updatedProduct.toObject({ flattenMaps: true }) as any;

      const { defaultImage, defaultPriceBDT, defaultVariantSku } = computeDefaults(
        updatedObj.variants,
        updatedObj.images,
      );

      updatedProduct.defaultImage = defaultImage || undefined;
      updatedProduct.defaultPriceBDT = defaultPriceBDT;
      updatedProduct.defaultVariantSku = defaultVariantSku || undefined;

      if (updatedProduct.isPublished) {
        productValidationSchemas.publishableProductZodSchema.shape.body.parse(sanitizeForValidation(updatedObj));
      }

      await updatedProduct.save({ session });

      // Cleanup Cloudinary
      if (publicIdsToDelete.length > 0) {
        const uniqueDeletes = [...new Set(publicIdsToDelete)].filter(Boolean);
        const trulyDeletable = uniqueDeletes.filter((pid) => !isPublicIdReferenced(updatedObj, pid));

        if (trulyDeletable.length > 0) {
          Promise.allSettled(trulyDeletable.map((pid) => deleteFileFromCloudinary(pid))).catch((e) => console.error(e));
        }
      }
    });

    // After transaction completes, return final document
    const finalProduct = await ProductModel.findById(id);

    if (!finalProduct) throw new AppError('Product Not Found after update.', httpStatus.NOT_FOUND);
    return finalProduct;
  } catch (error: any) {
    if (error?.code === 11000) {
      const key = error?.keyValue ? Object.keys(error.keyValue)[0] : '';
      if (key === 'slug') throw new AppError('Conflict: slug already exists.', httpStatus.CONFLICT);
      throw new AppError('Conflict: Title or SKU already exists.', httpStatus.CONFLICT);
    }
    throw error;
  } finally {
    session.endSession();
  }
};

const toggleProductStatus = async (id: string, isPublished: boolean) => {
  const product = await ProductModel.findById(id);
  if (!product) throw new AppError('Product Not Found!', httpStatus.NOT_FOUND);

  // If publishing, we MUST run validation to ensure the product is ready
  if (isPublished) {
    const productObj = product.toObject({ flattenMaps: true });
    const validationData = JSON.parse(JSON.stringify(productObj));

    // Ensure virtuals/defaults are set for validation
    validationData.isPublished = true;
    validationData.status = PRODUCT_STATUS.Active;

    // Flatten populated ObjectIds down to string IDs for Zod validation
    validationData.category =
      typeof validationData.category === 'object' ? validationData.category?._id : validationData.category;

    validationData.brand = typeof validationData.brand === 'object' ? validationData.brand?._id : validationData.brand;

    // Validate!
    productValidationSchemas.publishableProductZodSchema.shape.body.parse(validationData);

    // If valid, update state
    product.isPublished = true;
    product.status = PRODUCT_STATUS.Active;
  } else {
    // If unpublishing, just set to Draft. No validation needed.
    product.isPublished = false;
    product.status = PRODUCT_STATUS.Draft;
  }

  await product.save();
  return product;
};

export const ProductServices = {
  createProductIntoDB,
  getAllProductsForDashboardFromDB,
  getAllPublishedProductsFromDB,
  getSingleProductFromDB,
  updateProductIntoDB,
  softDeleteProductFromDB,
  restoreArchivedProductIntoDB,
  toggleProductStatus,
  getArchivedProductsFromDB,
  deleteProductsPermanentlyFromDB,
};
