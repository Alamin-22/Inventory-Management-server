export const formatCurrency = (amount: number) => `৳ ${amount.toFixed(2)}`;

export const formatStatus = (status: string) => {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const sanitizeWhatsAppNumber = (phone: string) => {
  return phone ? phone.replace(/[^0-9]/g, '') : '';
};
