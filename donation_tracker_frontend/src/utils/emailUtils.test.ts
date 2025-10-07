import { shouldDisplayEmail } from './emailUtils';

describe('emailUtils', () => {
  describe('shouldDisplayEmail', () => {
    it('returns false for auto-generated Anonymous@mailinator.com email', () => {
      expect(shouldDisplayEmail('Anonymous@mailinator.com')).toBe(false);
    });

    it('returns true for real email address', () => {
      expect(shouldDisplayEmail('john@example.com')).toBe(true);
    });

    it('returns false for @mailinator.com regardless of case', () => {
      expect(shouldDisplayEmail('Test@MAILINATOR.COM')).toBe(false);
    });
  });
});
