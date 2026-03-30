import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Category } from './Category.model';
import { ICategory } from './Category.interface';
import { AppError } from '@app/classes/AppError';
import { QueryBuilder } from '@app/classes/QueryBuilder';
import { slugGenerator } from '@utils/slugGenerator';

const createCategoryIntoDB = async (payload: Partial<ICategory>) => {
  const isExist = await Category.isCategoryExists(payload.name!);
  if (isExist) throw new AppError('Category already exists', httpStatus.CONFLICT);

  const slug = slugGenerator(payload.name!);
  payload.slug = slug;

  // Auto-assign the next order number
  const lastCategory = await Category.findOne({
    parentCategory: payload.parentCategory || null,
  }).sort({ order: -1 });

  payload.order = lastCategory ? lastCategory.order + 1 : 0;

  const result = await Category.create(payload);
  return result;
};

const getAllCategoriesFromDB = async (query: Record<string, unknown>) => {
  const categoryQuery = new QueryBuilder(Category, query);

  if (!query.sort) {
    categoryQuery.addStage({ $sort: { order: 1, createdAt: -1 } });
  } else {
    categoryQuery.sort();
  }

  categoryQuery.search(['name']).filter();

  if (query.search) {
    // SEARCH MODE (Flat list)
    categoryQuery.paginate();
  } else {
    // TREE MODE (Hierarchical)
    categoryQuery.addStage({
      $match: {
        $or: [{ parentCategory: null }, { parentCategory: { $exists: false } }],
      },
    });

    categoryQuery.paginate();

    categoryQuery.addStage({
      $lookup: {
        from: 'categories',
        let: { parentId: '$_id' },
        pipeline: [{ $match: { $expr: { $eq: ['$parentCategory', '$$parentId'] } } }, { $sort: { order: 1 } }],
        as: 'subcategories',
      },
    });
  }

  const result = await categoryQuery.exec();
  const meta = await categoryQuery.getQueryMeta();

  return { meta, result };
};

const getSingleCategoryFromDB = async (identifier: string) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  const matchQuery = isObjectId ? { _id: new mongoose.Types.ObjectId(identifier) } : { slug: identifier };

  const categoryPipeline = await Category.aggregate([
    { $match: matchQuery },
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
    { $unwind: { path: '$parent', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        description: 1,
        parentCategory: 1,
        subcategories: {
          $map: {
            input: '$subcategories',
            as: 'sub',
            in: {
              _id: '$$sub._id',
              name: '$$sub.name',
              slug: '$$sub.slug',
              description: '$$sub.description',
            },
          },
        },
      },
    },
  ]);

  return categoryPipeline[0] || null;
};

const updateCategoryIntoDB = async (id: string, payload: Partial<ICategory>) => {
  if (payload.name) {
    const isExist = await Category.findOne({
      name: { $regex: new RegExp(`^${payload.name}$`, 'i') },
      _id: { $ne: id },
    });
    if (isExist) throw new AppError('Category name already in use', httpStatus.CONFLICT);
    payload.slug = slugGenerator(payload.name);
  }

  const updatedCategory = await Category.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!updatedCategory) throw new AppError('Category not found', httpStatus.NOT_FOUND);
  return updatedCategory;
};

const deleteCategoryFromDB = async (id: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const deletedCategory = await Category.findByIdAndDelete(id).session(session);
    if (!deletedCategory) throw new AppError('Category not found', httpStatus.NOT_FOUND);

    // Cascading delete: Remove all children
    await Category.deleteMany({ parentCategory: id }).session(session);

    await session.commitTransaction();
    return deletedCategory;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

const reorderCategoriesInDB = async (payload: { id: string; order: number }[]) => {
  const bulkOps = payload.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));

  await Category.bulkWrite(bulkOps);
  return null;
};

export const CategoryServices = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  getSingleCategoryFromDB,
  updateCategoryIntoDB,
  deleteCategoryFromDB,
  reorderCategoriesInDB,
};
