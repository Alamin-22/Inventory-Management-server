export const TransactionType = ['sale', 'refund', 'fee'] as const;
export const PaymentCategory = [
  'full',
  'partial',
  'remaining',
  'booking_money',
  'refunded',
  'refund_fee', //
] as const;

export const TransactionMethod = [
  'online_gateway',
  'cod',
  'bank_transfer',
  'mobile_banking',
  'cash',
  'manual_refund',
  'system_adjustment',
] as const;

export const TransactionGateway = ['amarpay', 'stripe', 'manual'] as const;

export const TransactionSearchableFields = [
  'gatewayInfo.bankTransactionId',
  'gatewayInfo.storeTransactionId',
  'notes',
  'orderInfo.orderNumber',
];
