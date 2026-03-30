/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { IBrand } from './Brand.interface';
import { slugify } from '@utils/slugGenerator';
import { purgeCloudinaryImages } from '@utils/sendMediaToCloudinary';
import { getBrandModel } from './Brand.model';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { AppError } from '@app/classes/AppError';
import { TBrand } from '../auth/auth.interface';
import { Connection } from 'mongoose';
import { addFileToQueue, getImageFromFile, uploadUniqueFiles } from '../products/product.utils';
import { getCategoryModel } from '../Category/Category.model';

export const BrandServices = (connection: Connection, storePreference: TBrand) => {
  const BrandModel = getBrandModel(connection);
  getCategoryModel(connection); // without this we can not perform populations from category
  const BRAND_FOLDER_SUFFIX = `brands`;

  const createBrandIntoDB = async (payload: IBrand, file: any): Promise<IBrand> => {
    const slug = slugify(payload.name);

    const brandData: Partial<IBrand> = {
      ...payload,
      slug,
      storePreference,
      brandLabel: payload.brandLabel ? payload.brandLabel : undefined,
    };

    // --- OPTIMIZED UPLOAD LOGIC START ---
    if (file) {
      const uniqueFilesMap = new Map<string, any>();

      addFileToQueue(file, uniqueFilesMap);

      const urlMap = await uploadUniqueFiles(storePreference, slug, uniqueFilesMap, BRAND_FOLDER_SUFFIX);

      //  Retrieve the uploaded image object { url, publicId }
      const logoImage = getImageFromFile(file, urlMap);

      if (logoImage) {
        brandData.logo = logoImage;
      }
    }

    const result = await BrandModel.create(brandData);
    return result;
  };

  const getAllBrandsFromDB = async (query: Record<string, any>) => {
    const brandQuery = new QueryBuilder<IBrand>(BrandModel, {
      ...query,
      isPublished: true,
    });

    const result = await brandQuery.search(['name', 'slug']).filter().sort().paginate().limitFields().exec();

    const meta = await brandQuery.getQueryMeta();

    return { meta, result };
  };

  const getAllBrandsForDashboardFromDB = async (query: Record<string, any>) => {
    const brandQuery = new QueryBuilder<IBrand>(BrandModel, {
      ...query,
    });

    const result = await brandQuery
      .search(['name', 'slug'])
      .filter()

      .populate({
        from: 'categories',
        localField: 'brandLabel',
        foreignField: '_id',
        as: 'brandLabel',
        unwind: true,
        pipeline: [{ $project: { name: 1, _id: 1 } }],
      })
      .sort()
      .paginate()
      .limitFields()
      .exec();

    const meta = await brandQuery.getQueryMeta();

    return { meta, result };
  };

  const getSingleBrandFromDB = async (id: string): Promise<IBrand | null> => {
    const result = await BrandModel.findById(id);

    return result;
  };

  const updateBrandIntoDB = async (id: string, payload: Partial<IBrand>, file: any): Promise<IBrand | null> => {
    const existingBrand = await BrandModel.findById(id);

    if (!existingBrand) {
      throw new AppError('Brand Not Found', httpStatus.NOT_FOUND);
    }

    if (payload.brandLabel && payload.brandLabel.toString() === '') {
      (payload as any).brandLabel = undefined; // Unset the field in DB if empty string
    }

    const currentSlug = payload.name ? slugify(payload.name) : existingBrand.slug;
    if (payload.name) {
      payload.slug = currentSlug;
    }

    if (file) {
      // Purge Old Image if it exists
      if (existingBrand.logo && existingBrand.logo.publicId) {
        await purgeCloudinaryImages([{ publicId: existingBrand.logo.publicId }]);
      }

      const uniqueFilesMap = new Map<string, any>();
      addFileToQueue(file, uniqueFilesMap);

      const urlMap = await uploadUniqueFiles(storePreference, currentSlug, uniqueFilesMap, BRAND_FOLDER_SUFFIX);

      const newLogo = getImageFromFile(file, urlMap);
      if (newLogo) {
        payload.logo = newLogo;
      }
    }

    const result = await BrandModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    return result;
  };

  const deleteBrandFromDB = async (id: string): Promise<IBrand | null> => {
    // A. Delete the document and get the deleted data back
    const result = await BrandModel.findByIdAndDelete(id);

    if (!result) {
      throw new AppError('Brand Not Found To Delete', httpStatus.NOT_FOUND);
    }

    if (result.logo && result.logo.publicId) {
      await purgeCloudinaryImages([{ publicId: result.logo.publicId }]);
    }

    return result;
  };

  return {
    createBrandIntoDB,
    getAllBrandsFromDB,
    getSingleBrandFromDB,
    updateBrandIntoDB,
    deleteBrandFromDB,
    getAllBrandsForDashboardFromDB,
  };
};
