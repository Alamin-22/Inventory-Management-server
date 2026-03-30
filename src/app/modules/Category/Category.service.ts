/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { ClientSession } from 'mongoose';
import { Connection } from 'mongoose';
import { getCategoryModel } from './Category.model';
import { ICategory } from './Category.interface';
import { slugify } from '@utils/slugGenerator';
import { purgeCloudinaryImages } from '@utils/sendMediaToCloudinary';
import { AppError } from '@app/classes/AppError';
import httpStatus from 'http-status/lib';
import { TBrand } from '@app/modules/auth/auth.interface';
import { addFileToQueue, uploadUniqueFiles } from '@app/modules/products/product.utils';
import { QueryBuilder } from '@app/classes/QueryBuilder';

export const CategoryServices = (connection: Connection, storePreference: TBrand) => {
  const CategoryModel = getCategoryModel(connection);
  const folderName = `categories`;

  const createCategoryIntoDB = async (payload: ICategory, file: any): Promise<ICategory> => {
    const session: ClientSession = await connection.startSession();

    const uploadQueue = new Map();
    let uploadedImage: { url: string; publicId: string } | undefined;

    try {
      session.startTransaction();

      const slug = slugify(payload.name);
      payload.slug = slug;

      // Auto-assign the next order number
      // We find the current max order for the same level (Root or specific Parent)
      const lastCategory = await CategoryModel.findOne({
        parentCategory: payload.parentCategory || null,
      })
        .sort({ order: -1 })
        .session(session);

      payload.order = lastCategory ? lastCategory.order + 1 : 0;

      // Handle Image Upload
      if (file) {
        const fileKey = addFileToQueue(file, uploadQueue);
        const urlMap = await uploadUniqueFiles(storePreference, slug, uploadQueue, folderName);
        uploadedImage = urlMap.get(fileKey!);
        payload.categoryImage = uploadedImage;
      }

      const result = await CategoryModel.create([payload], { session });

      if (!result.length) {
        throw new AppError('Failed to create category', httpStatus.BAD_REQUEST);
      }

      await session.commitTransaction();
      return result[0];
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      if (uploadedImage?.publicId) {
        await purgeCloudinaryImages([{ publicId: uploadedImage.publicId }]);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  };

  const getAllCategoriesFromDB = async (query: Record<string, unknown>) => {
    const categoryQuery = new QueryBuilder(CategoryModel, query);

    // If no sort is provided in query, we default to our custom drag-and-drop order
    if (!query.sort) {
      categoryQuery.addStage({ $sort: { order: 1, createdAt: -1 } });
    } else {
      categoryQuery.sort();
    }

    categoryQuery.search(['name']).filter();

    // 3. Conditional Logic: Search vs Tree
    if (query.search) {
      // --- SEARCH MODE ---
      categoryQuery.paginate();
    } else {
      // --- TREE MODE ---

      // A. Filter only Root Categories
      categoryQuery.addStage({
        $match: {
          $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
        },
      });

      // B. Paginate the Roots
      categoryQuery.paginate();

      // C. Attach Subcategories (The Tree Logic)
      categoryQuery.addStage({
        $lookup: {
          from: 'categories',
          let: { parentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$parentCategory', '$$parentId'] },
              },
            },
            // Sort subcategories by 'order'
            { $sort: { order: 1 } },
          ],
          as: 'subcategories',
        },
      });
    }

    const result = await categoryQuery.exec();
    const meta = await categoryQuery.getQueryMeta();

    return { meta, result };
  };

  const getSingleCategoryFromDB = async (identifier: string): Promise<ICategory | null> => {
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

    const matchQuery = isObjectId ? { _id: new mongoose.Types.ObjectId(identifier) } : { slug: identifier };

    const categoryPipeline = await CategoryModel.aggregate([
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: 'parentCategory',
          as: 'subcategories',
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'parentCategory',
          foreignField: '_id',
          as: 'parent',
        },
      },
      {
        $unwind: {
          path: '$parent',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          description: 1,
          seoTitle: 1,
          seoDescription: 1,
          categoryImage: 1,
          isFeatured: 1,
          subcategories: {
            $map: {
              input: '$subcategories',
              as: 'sub',
              in: {
                _id: '$$sub._id',
                name: '$$sub.name',
                slug: '$$sub.slug',
                description: '$$sub.description',
                seoTitle: '$$sub.seoTitle',
                seoDescription: '$$sub.seoDescription',
                categoryImage: '$$sub.categoryImage',
                isFeatured: '$$sub.isFeatured',
              },
            },
          },
        },
      },
    ]);

    return categoryPipeline[0] || null;
  };

  const updateCategoryIntoDB = async (
    id: string,
    payload: Partial<ICategory>,
    file: any,
  ): Promise<ICategory | null> => {
    const session: ClientSession = await connection.startSession();
    const uploadQueue = new Map();
    let newUploadedImage: { url: string; publicId: string } | undefined;

    try {
      session.startTransaction();

      const existingCategory = await CategoryModel.findById(id).session(session);
      if (!existingCategory) {
        throw new AppError('Category not found', httpStatus.NOT_FOUND);
      }

      if (payload.name) {
        payload.slug = slugify(payload.name);
      }

      // Handle Image Update
      if (file) {
        const uniqueName = payload.slug || existingCategory.slug;
        const fileKey = addFileToQueue(file, uploadQueue);
        const urlMap = await uploadUniqueFiles(storePreference, uniqueName, uploadQueue, folderName);
        newUploadedImage = urlMap.get(fileKey!);
        payload.categoryImage = newUploadedImage;
      }

      const updatedCategory = await CategoryModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
        session,
      });

      await session.commitTransaction();

      // Clean up old image from Cloudinary if new one was uploaded
      if (file && existingCategory.categoryImage?.publicId) {
        await purgeCloudinaryImages([{ publicId: existingCategory.categoryImage.publicId }]);
      }

      return updatedCategory;
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      if (newUploadedImage?.publicId) {
        await purgeCloudinaryImages([{ publicId: newUploadedImage.publicId }]);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  };

  const deleteCategoryFromDB = async (id: string) => {
    //  Find the children first so we know their IDs
    const childCategories = await CategoryModel.find({ parentCategory: id }).select('_id categoryImage');
    const childIds = childCategories.map((child) => child._id.toString());

    // Perform the deletion of the parent
    const deletedCategory = await CategoryModel.findByIdAndDelete(id);

    if (!deletedCategory) {
      throw new AppError('Category not found', httpStatus.NOT_FOUND);
    }

    // Perform the cascading delete of children
    await CategoryModel.deleteMany({ parentCategory: id });

    // Prepare all images for purging (Parent + All Children)
    const imagesToPurge = [];

    // Add Parent Image
    if (deletedCategory.categoryImage?.publicId) {
      imagesToPurge.push({ publicId: deletedCategory.categoryImage.publicId });
    }

    // Add Children Images
    childCategories.forEach((child) => {
      if (child.categoryImage?.publicId) {
        imagesToPurge.push({ publicId: child.categoryImage.publicId });
      }
    });

    if (imagesToPurge.length > 0) {
      await purgeCloudinaryImages(imagesToPurge);
    }

    // Return both the deleted parent and the list of affected child IDs
    return {
      deletedCategory,
      affectedIds: [id, ...childIds],
    };
  };

  const reorderCategoriesInDB = async (payload: { id: string; order: number }[]) => {
    const session = await connection.startSession();

    try {
      session.startTransaction();

      const bulkOps = payload.map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { order: item.order } },
        },
      }));

      await CategoryModel.bulkWrite(bulkOps, { session });

      await session.commitTransaction();
    } catch (error: any) {
      // Only abort if the transaction actually started
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      // Always close the session to free up the connection pool
      await session.endSession();
    }
  };

  return {
    createCategoryIntoDB,
    getAllCategoriesFromDB,
    getSingleCategoryFromDB,
    updateCategoryIntoDB,
    deleteCategoryFromDB,
    reorderCategoriesInDB,
  };
};
