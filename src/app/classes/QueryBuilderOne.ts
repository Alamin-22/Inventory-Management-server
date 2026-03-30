/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Types, HydratedDocument } from 'mongoose';

export interface IPopulateOptions {
  path: string;
  select?: string;
}

export class QueryBuilderOne<T> {
  private model: Model<T>;
  private queryObj: Record<string, any>;
  private filterObj: Record<string, any> = {};
  private selectedFields: string | null = null;
  private population: (string | IPopulateOptions)[] = [];

  constructor(model: Model<T>, queryObj: Record<string, any>) {
    this.model = model;
    this.queryObj = queryObj;
  }

  filter(additionalFields: string[] = []): this {
    const query = { ...this.queryObj };
    const exclude = ['sort', 'limitFields', 'search', 'populate', ...additionalFields];

    exclude.forEach((f) => delete query[f]);

    const operatorPattern = /\b(gte|gt|lte|lt|ne|in|nin|regex)\b/g;
    let queryStr = JSON.stringify(query);
    queryStr = queryStr.replace(operatorPattern, (match) => `$${match}`);
    const mongoQuery = JSON.parse(queryStr);

    for (const key in mongoQuery) {
      const val = mongoQuery[key];
      if (typeof val === 'string' && Types.ObjectId.isValid(val)) {
        mongoQuery[key] = new Types.ObjectId(val);
      } else if (typeof val === 'object') {
        for (const op in val) {
          if (['$in', '$nin'].includes(op) && typeof val[op] === 'string') {
            val[op] = val[op].split(',');
          }
        }
      } else if (val === 'true' || val === 'false') {
        mongoQuery[key] = val === 'true';
      }
    }

    this.filterObj = mongoQuery;
    return this;
  }

  search(searchableFields: string[]): this {
    const searchText = this.queryObj.search;
    if (searchText && searchableFields?.length) {
      const orConditions = searchableFields?.map((field) => ({
        [field]: { $regex: searchText, $options: 'i' },
      }));

      if (Object.keys(this.filterObj)?.length) {
        this.filterObj = { $and: [this.filterObj, { $or: orConditions }] };
      } else {
        this.filterObj = { $or: orConditions };
      }
    }
    return this;
  }

  limitFields(): this {
    if (this.queryObj.limitFields) {
      const fields = this.queryObj.limitFields
        .split(',')
        .map((f: string) => f.trim())
        .join(' ');
      this.selectedFields = fields;
    }
    return this;
  }

  populate(path?: string | IPopulateOptions): this {
    if (path) {
      this.population.push(path);
      return this;
    }

    const rawPopulate = this.queryObj.populate;

    if (typeof rawPopulate === 'string') {
      const paths = rawPopulate
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of paths) {
        this.population.push({ path: p });
      }
    } else if (Array.isArray(rawPopulate)) {
      // For array of objects: [{ path: 'x', select: 'y' }, ...]
      this.population.push(...rawPopulate);
    } else if (typeof rawPopulate === 'object' && rawPopulate?.path) {
      // For single object: { path: 'x', select: 'y' }
      this.population.push(rawPopulate);
    }

    return this;
  }

  async exec(): Promise<HydratedDocument<T> | null> {
    let query = this.model.findOne(this.filterObj);

    for (const pop of this.population) {
      if (typeof pop === 'string') {
        query = query.populate(pop);
      } else {
        query = query.populate(pop);
      }
    }

    if (this.selectedFields) {
      query = query.select(this.selectedFields);
    }

    return await query.exec();
  }
}
