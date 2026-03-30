export const OrderSearchableFields = [
  'orderNumber',
  'email',
  'user',
  'items.sku',
  'fulfillmentStatus',
  'shippingAddress.phone',
  'shippingAddress.name',
  'shippingAddress.street1',
];

export const orderStatusEnum = [
  'pending', // (Optional: Initial transient state)
  'group-buy-pending', // this is for group buy orders only and the initial state
  'awaiting-payment', // Logic: Inventory reserved, unpaid.
  'confirmed', // Logic: Paid.
  'processing', // Logic: Admin working on it.
  'shipped', // Logic: Left your control (or source control).
  'delivered', // Logic: Done.
  'cancelled',
  'returned',
  'abandoned',
];

export type OrderStatus = (typeof orderStatusEnum)[number];
