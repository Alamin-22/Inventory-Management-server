export const productSearchableFields = ['title', 'slug', 'variants.sku', 'brandForExternal'];

export const PRODUCT_SOURCE_TYPE = {
  MANUAL: 'MANUAL',
  SCRAPER: 'SCRAPER',
  EXTERNAL_API: 'EXTERNAL_API',
} as const;

export const PRODUCT_FULFILLMENT_TYPE = {
  CROSS_BORDER: 'CROSS_BORDER',
  READY_TO_SHIP: 'READY_TO_SHIP',
} as const;

export const PRODUCT_STATUS = {
  Draft: 'Draft',
  Active: 'Active',
  Deleted: 'Deleted',
} as const;

export const CURRENCY = {
  USD: 'USD',
  CNY: 'CNY',
  BDT: 'BDT',
} as const;

export type TProductSourceType = (typeof PRODUCT_SOURCE_TYPE)[keyof typeof PRODUCT_SOURCE_TYPE];
export type TProductFulfillmentType = (typeof PRODUCT_FULFILLMENT_TYPE)[keyof typeof PRODUCT_FULFILLMENT_TYPE];
export type TProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
export type TCurrency = (typeof CURRENCY)[keyof typeof CURRENCY];
