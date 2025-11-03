import { formatCurrency, parseCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats 10000 cents as $100.00', () => {
    expect(formatCurrency(10000)).toBe('$100.00');
  });

  it('formats 2500 cents as $25.00', () => {
    expect(formatCurrency(2500)).toBe('$25.00');
  });
});

describe('parseCurrency', () => {
  it('converts 100 dollars to 10000 cents', () => {
    expect(parseCurrency(100)).toBe(10000);
  });

  it('converts "25.50" string to 2550 cents', () => {
    expect(parseCurrency("25.50")).toBe(2550);
  });
});
