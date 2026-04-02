export const AdminPermissions = {
  FULL_ACCESS: 'full_access',
  MANAGE_INVENTORY: 'manage_inventory',
  MANAGE_STOCK: 'manage_stock',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_USERS: 'manage_users',
} as const;

export type TAdminPermission = (typeof AdminPermissions)[keyof typeof AdminPermissions];

export const PermissionManifest: Record<TAdminPermission, { label: string; description: string }> = {
  [AdminPermissions.FULL_ACCESS]: {
    label: 'Full System Access',
    description: 'Grant absolute control over all system modules and administrative overrides.',
  },
  [AdminPermissions.MANAGE_INVENTORY]: {
    label: 'Inventory Management',
    description: 'Allows creation and editing of Products and Categories in the catalog.',
  },
  [AdminPermissions.MANAGE_STOCK]: {
    label: 'Stock & Order Processing',
    description: 'Enables processing orders, deducting stock, and managing the Restock Queue.',
  },
  [AdminPermissions.VIEW_ANALYTICS]: {
    label: 'Analytics & Reporting',
    description: 'Access to the main dashboard, revenue tracking, and system activity logs.',
  },
  [AdminPermissions.MANAGE_USERS]: {
    label: 'Staff & CRM Management',
    description: 'Authority to add new staff members, manage permissions, and edit customer CRM records.',
  },
};

export const AdminSearchableFields = ['email', 'id', 'contactNo', 'name'];
