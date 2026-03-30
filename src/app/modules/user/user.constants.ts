export const USER_ROLE = {
  super_admin: 'super_admin',
  admin: 'admin',
  customer: 'customer',
  editor: 'editor',
  manager: 'manager',
} as const;

export const USER_STATUS = {
  active: 'active',
  blocked: 'blocked',
} as const;

export const UserSearchableFields = ['email', 'id', 'contactNo', 'name'];
