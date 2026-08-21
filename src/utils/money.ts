export const toPaise = (rupees: number | string): number => {
  const value = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
};

export const toRupees = (paise: number): number => {
  if (isNaN(paise)) return 0;
  return paise / 100;
};

export const formatINR = (paise: number): string => {
  if (isNaN(paise)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2, // Usually 0 is fine for whole rupees, but keeps 2 if needed
  }).format(paise / 100);
};
