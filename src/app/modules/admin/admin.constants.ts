export const AdminPermissions = {
  FULL_ACCESS: 'full_access',
  MANAGE_INVENTORY: 'manage_inventory',
  MANAGE_SCRAPER: 'manage_scraper',
  MANAGE_DEALS: 'manage_deals',
  MANAGE_ORDERS: 'manage_orders',
  MANAGE_FINANCE: 'manage_finance',
  MANAGE_MARKETING: 'manage_marketing',
  MANAGE_USERS: 'manage_users',
} as const;

export type TAdminPermission = (typeof AdminPermissions)[keyof typeof AdminPermissions];

export const PermissionManifest: Record<TAdminPermission, { label: string; description: string }> = {
  [AdminPermissions.FULL_ACCESS]: {
    label: 'Full System Access',
    description:
      'Grant absolute control over all system modules, including sensitive data and administrative overrides.',
  },
  [AdminPermissions.MANAGE_INVENTORY]: {
    label: 'Inventory & Catalog',
    description: 'Allows management of standard Products, Brands, Categories, and stock levels .',
  },
  [AdminPermissions.MANAGE_SCRAPER]: {
    label: 'Scraper & External Sourcing',
    description: 'Enables review and verification of products from Amazon, eBay, Walmart, and other external engines.',
  },
  [AdminPermissions.MANAGE_DEALS]: {
    label: 'Group Buy & Campaigns',
    description: 'Manage Group Buy lifecycles, milestone adjustments, and active campaign configurations.',
  },
  [AdminPermissions.MANAGE_ORDERS]: {
    label: 'Orders & Logistics',
    description: 'View and process customer orders, update shipping tracking, and manage return requests.',
  },
  [AdminPermissions.MANAGE_FINANCE]: {
    label: 'Financial Operations',
    description: 'Access to transaction logs, manual payment verification, and the authority to process refunds.',
  },
  [AdminPermissions.MANAGE_MARKETING]: {
    label: 'Marketing & Content',
    description: 'Manage Hero banners, dynamic collections, promotional badges, coupons, and newsletters.',
  },
  [AdminPermissions.MANAGE_USERS]: {
    label: 'User & CRM Management',
    description:
      'Manage customer profiles, review ratings, and perform user-level security actions like blocking accounts.',
  },
};
