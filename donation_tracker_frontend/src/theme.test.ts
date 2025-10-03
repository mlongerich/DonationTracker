import { theme } from './theme';

describe('Theme Configuration', () => {
  it('has mobile-first breakpoints defined', () => {
    expect(theme.breakpoints.values.xs).toBe(0);
    expect(theme.breakpoints.values.sm).toBe(600);
  });

  it('has primary color defined', () => {
    expect(theme.palette.primary.main).toBe('#1976d2');
  });
});
