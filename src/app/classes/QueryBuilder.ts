/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, PipelineStage, Types } from 'mongoose';

export interface IQueryMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PopulateOption {
  from: string;
  localField: string;
  foreignField: string;
  as?: string;
  unwind?: boolean;
  pipeline?: PipelineStage[];
}

export class QueryBuilder<T> {
  public model: Model<T>;
  public pipeline: any[];
  public queryObj: Record<string, any>;
  private static defaultLimit = 50;
  private static defaultPage = 1;

  constructor(model: Model<T>, queryObj: Record<string, any>) {
    this.model = model;
    this.pipeline = [];
    this.queryObj = queryObj;
  }

  // =========================================================
  // 1. UTILITY STAGES
  // =========================================================

  // Add arbitrary stage
  customMethod(pipelineStages: Record<string, any>[]): this {
    this.pipeline.push(...pipelineStages);
    return this;
  }

  // Alias for customMethod/addStage
  addStage(stage: PipelineStage): this {
    this.pipeline.push(stage);
    return this;
  }

  addField(fieldPath: string, value: any): this {
    this.pipeline.push({ $addFields: { [fieldPath]: `$${value}` } });
    return this;
  }

  replaceRoot(newRootField: string): this {
    this.pipeline.push({ $replaceRoot: { newRoot: `$${newRootField}` } });
    return this;
  }

  unwind(field: string): this {
    this.pipeline.push({ $unwind: '$' + field });
    return this;
  }

  // Specialized projection method
  select(fields: string): this {
    if (!fields) return this;
    const fieldArr = fields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    const projection: Record<string, 1 | 0> = {};

    let inclusionCount = 0;
    let exclusionCount = 0;

    for (const field of fieldArr) {
      const isExcluded = field.startsWith('-');
      const cleanField = field.replace(/^-/, '');

      if (cleanField !== '_id') {
        if (isExcluded) exclusionCount++;
        else inclusionCount++;
      }
      projection[cleanField] = isExcluded ? 0 : 1;
    }

    if (inclusionCount > 0 && exclusionCount > 0) {
      throw new Error('Cannot mix inclusion and exclusion in projection, except excluding _id.');
    }

    this.pipeline.push({ $project: projection });
    return this;
  }

  removeField(field: string): this {
    this.pipeline.push({ $project: { [field]: 0 } });
    return this;
  }

  pluckFromArray(arrayField: string, newFieldName: string, index = 0): this {
    this.pipeline.push({
      $addFields: { [newFieldName]: { $arrayElemAt: [`$${arrayField}`, index] } },
    });
    return this;
  }

  // Alias for pluckFromArray (kept for compatibility)
  extractFromArray(arrayField: string, newField: string, index: number): this {
    return this.pluckFromArray(arrayField, newField, index);
  }

  countArrayLength(arrayField: string, newField: string): this {
    this.pipeline.push({
      $addFields: {
        [newField]: {
          $cond: {
            if: { $isArray: `$${arrayField}` },
            then: { $size: `$${arrayField}` },
            else: 0,
          },
        },
      },
    });
    return this;
  }

  // Simple match helper
  match(field: string, value: any): this {
    this.pipeline.push({ $match: { [field]: value } });
    return this;
  }

  // =========================================================
  // 2. FILTER (The "Smart" Hybrid Version)
  // =========================================================

  filter(additionalExcludedFields: string[] = []): this {
    const queryObj = { ...this.queryObj };
    const excludeFields = [
      'page',
      'sort',
      'limit',
      'limitFields',
      'search',
      'fields',
      'withDeleted',
      'min_price',
      'max_price',
      ...additionalExcludedFields,
    ];

    if (this.queryObj.withDeleted !== true) {
      this.pipeline.push({ $match: { isDeleted: { $ne: true } } });
    }

    const mongoQueryObject: Record<string, any> = {};

    const arrayIdFields = ['category', 'products', 'orderItems', 'supplier'];

    for (const key in queryObj) {
      let value = queryObj[key];

      if (excludeFields.includes(key)) continue;

      if (value === 'true') value = true;
      if (value === 'false') value = false;

      if (arrayIdFields.includes(key) && typeof value === 'string' && value.includes(',')) {
        const ids = value
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => Types.ObjectId.isValid(id));

        if (ids.length > 0) {
          mongoQueryObject[key] = { $in: ids.map((id: string) => new Types.ObjectId(id)) };
          continue;
        }
      }

      if (arrayIdFields.includes(key) && typeof value === 'string' && Types.ObjectId.isValid(value)) {
        mongoQueryObject[key] = new Types.ObjectId(value);
        continue;
      }

      mongoQueryObject[key] = value;
    }

    // operator transform
    const OPS = ['gte', 'gt', 'lte', 'lt', 'ne', 'in', 'nin', 'regex'];

    const transformOperators = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(transformOperators);

      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const [k, v] of Object.entries(obj)) {
          const newKey = OPS.includes(k) && !k.startsWith('$') ? `$${k}` : k;
          newObj[newKey] = transformOperators(v);
        }
        return newObj;
      }

      return obj;
    };

    const transformedQuery = transformOperators(mongoQueryObject);

    const minPrice = this.queryObj.min_price;
    const maxPrice = this.queryObj.max_price;

    if (minPrice !== undefined || maxPrice !== undefined) {
      // Assuming 'price' or 'totalPrice' will be the standard number field you want to filter
      // You can pass the specific field name via query, or default to 'totalPrice'
      const targetField = this.queryObj.priceField || 'totalPrice';

      transformedQuery[targetField] = {
        ...(transformedQuery[targetField] || {}),
        ...(minPrice !== undefined && minPrice !== '' ? { $gte: Number(minPrice) } : {}),
        ...(maxPrice !== undefined && maxPrice !== '' ? { $lte: Number(maxPrice) } : {}),
      };
    }

    // restore ObjectIds if needed
    for (const key in transformedQuery) {
      const value = transformedQuery[key];

      if (arrayIdFields.includes(key) && value?.$in && Array.isArray(value.$in)) {
        transformedQuery[key].$in = value.$in.map((id: any) =>
          Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id,
        );
      }

      if (arrayIdFields.includes(key) && typeof value === 'string' && Types.ObjectId.isValid(value)) {
        transformedQuery[key] = new Types.ObjectId(value);
      } else if (typeof value === 'string' && Types.ObjectId.isValid(value) && !key.startsWith('$')) {
        transformedQuery[key] = new Types.ObjectId(value);
      }
    }

    this.pipeline.push({ $match: transformedQuery });
    return this;
  }

  // =========================================================
  // 3. SEARCH
  // =========================================================
  search(searchFields: string[]): this {
    const searchText = this.queryObj.search;

    if (searchText && searchFields.length > 0) {
      const unwindPaths = new Set<string>();
      const matchConditions: any[] = [];

      // Step 1: Detect paths that need unwinding (e.g., 'variants.sku')
      for (const field of searchFields) {
        const parts = field.split('.');
        if (parts.length > 1) {
          unwindPaths.add(parts[0]); // e.g., 'variants'
        }
        matchConditions.push({
          [field]: { $regex: searchText, $options: 'i' },
        });
      }

      // Preserve original doc before destructive unwind
      this.pipeline.push({ $addFields: { __original: '$$ROOT' } });

      // Step 2: Unwind arrays
      for (const path of [...unwindPaths]) {
        this.pipeline.push({
          $unwind: { path: `$${path}`, preserveNullAndEmptyArrays: true },
        });
      }

      // Step 3: Match
      this.pipeline.push({ $match: { $or: matchConditions } });

      // Step 4: Restore original document structure
      this.pipeline.push(
        {
          $group: {
            _id: '$_id',
            fullDoc: { $first: '$__original' },
          },
        },
        {
          $replaceRoot: { newRoot: '$fullDoc' },
        },
      );
    }
    return this;
  }

  // =========================================================
  // 4. STANDARD OPERATIONS
  // =========================================================

  sort(sortMap?: Record<string, string | Record<string, 1 | -1>>): this {
    const sortBy = this.queryObj.sort || '-createdAt';

    if (sortMap && sortMap[sortBy]) {
      const mappedSort = sortMap[sortBy];

      if (typeof mappedSort === 'string') {
        this.pipeline.push({ $sort: { [mappedSort]: 1 } });
        return this;
      }

      this.pipeline.push({ $sort: mappedSort });
      return this;
    }

    const sortFields: Record<string, 1 | -1> = {};
    sortBy.split(',').forEach((field: string) => {
      const trimmed = field.trim();
      sortFields[trimmed.replace('-', '')] = trimmed.startsWith('-') ? -1 : 1;
    });

    this.pipeline.push({ $sort: sortFields });
    return this;
  }

  paginate(): this {
    const page = Number(this.queryObj.page) || QueryBuilder.defaultPage;
    const limit = Number(this.queryObj.limit) || QueryBuilder.defaultLimit;
    const skip = (page - 1) * limit;
    this.pipeline.push({ $skip: skip }, { $limit: limit });
    return this;
  }

  limitFields(): this {
    // Support both 'limitFields' and 'fields'
    const fieldsParam = this.queryObj.limitFields || this.queryObj.fields;
    if (fieldsParam) {
      const fields = fieldsParam.split(',').reduce((acc: any, field: string) => {
        acc[field.trim()] = 1;
        return acc;
      }, {});
      this.pipeline.push({ $project: { ...fields } });
    } else {
      this.pipeline.push({ $project: { __v: 0 } });
    }
    return this;
  }

  populate({ localField, from, as, foreignField, unwind = false, pipeline = [] }: PopulateOption): this {
    const asField = as || localField;
    const lookupStage: any = {
      from,
      localField,
      foreignField,
      as: asField,
    };
    if (pipeline.length > 0) lookupStage.pipeline = pipeline;

    this.pipeline.push({ $lookup: lookupStage });

    if (unwind) {
      this.pipeline.push({
        $unwind: { path: `$${asField}`, preserveNullAndEmptyArrays: true },
      });
    }
    return this;
  }

  async getQueryMeta(): Promise<IQueryMeta> {
    const countPipeline = this.pipeline.filter(
      (stage) => !('$skip' in stage || '$limit' in stage || '$project' in stage),
    );
    countPipeline.push({ $count: 'total' });
    const result = await this.model.aggregate(countPipeline);
    const total = result[0]?.total || 0;
    const limit = Number(this.queryObj.limit) || QueryBuilder.defaultLimit;
    const page = Number(this.queryObj.page) || QueryBuilder.defaultPage;
    const totalPages = Math.ceil(total / limit);
    return { total, page, limit, totalPages };
  }

  async exec(): Promise<T[]> {
    return await this.model.aggregate(this.pipeline);
  }
}
