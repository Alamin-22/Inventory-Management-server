export const getDateRange = (year?: number, month?: number): { start: Date; end: Date } => {
  const now = new Date();
  const currentYear = year || now.getFullYear();

  if (month) {
    const start = new Date(currentYear, month - 1, 1, 0, 0, 0);
    const end = new Date(currentYear, month, 0, 23, 59, 59);
    return { start, end };
  }

  // Default: Current Month
  const start = new Date(currentYear, now.getMonth(), 1, 0, 0, 0);
  const end = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
};

export const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
};
