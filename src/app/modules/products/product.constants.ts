export const productSearchableFields = ['title', 'slug', 'variants.sku'];

export const PRODUCT_STATUS = {
  Draft: 'Draft',
  Active: 'Active',
  Out_Of_Stock: 'Out_Of_Stock',
  Deleted: 'Deleted',
} as const;

export type TProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
