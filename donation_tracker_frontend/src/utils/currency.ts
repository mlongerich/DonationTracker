export const formatCurrency = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

export const parseCurrency = (dollars: string | number): number => {
  return Math.round(parseFloat(String(dollars)) * 100);
};
