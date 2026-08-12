import { describe, test, expect } from 'vitest';
import { isValidOccurrence, RecurrenceConfig } from '../../lib/recurrence';

function createConfig(overrides: Partial<RecurrenceConfig>): RecurrenceConfig {
  return {
    frequency: 'daily',
    daysOfWeek: null,
    startDate: new Date(2024, 0, 1),
    endDate: null,
    ...overrides,
  };
}

describe('isValidOccurrence', () => {
  describe('Daily Frequency', () => {
    test('should return true for any date', () => {
      const config = createConfig({ frequency: 'daily' });
      expect(isValidOccurrence(new Date(2024, 0, 1), config)).toBe(true);
      expect(isValidOccurrence(new Date(2024, 0, 2), config)).toBe(true);
      expect(isValidOccurrence(new Date(2024, 11, 31), config)).toBe(true);
    });
  });

  describe('Weekly Frequency', () => {
    test('should return true if the date matches one of the specified days of the week', () => {
      const config = createConfig({
        frequency: 'weekly',
        daysOfWeek: ['M', 'W', 'F'],
      });
      expect(isValidOccurrence(new Date(2024, 0, 1), config)).toBe(true); // Monday
      expect(isValidOccurrence(new Date(2024, 0, 3), config)).toBe(true); // Wednesday
      expect(isValidOccurrence(new Date(2024, 0, 5), config)).toBe(true); // Friday
    });

    test('should return false if the date does not match any of the specified days of the week', () => {
      const config = createConfig({
        frequency: 'weekly',
        daysOfWeek: ['M', 'W', 'F'],
      });
      expect(isValidOccurrence(new Date(2024, 0, 2), config)).toBe(false); // Tuesday
      expect(isValidOccurrence(new Date(2024, 0, 4), config)).toBe(false); // Thursday
    });

    test('should return false if daysOfWeek is empty', () => {
      const config = createConfig({ frequency: 'weekly', daysOfWeek: [] });
      expect(isValidOccurrence(new Date(2024, 0, 1), config)).toBe(false);
    });

    test('should return false if daysOfWeek is null', () => {
      const config = createConfig({ frequency: 'weekly', daysOfWeek: null });
      expect(isValidOccurrence(new Date(2024, 0, 1), config)).toBe(false);
    });
  });

  describe('Bi-Weekly Frequency', () => {
    // Current implementation behaves like weekly for isValidOccurrence.
    test('should return true if the date matches one of the specified days of the week', () => {
      const config = createConfig({
        frequency: 'bi-weekly',
        daysOfWeek: ['M'],
        startDate: new Date(2024, 0, 1),
      });
      expect(isValidOccurrence(new Date(2024, 0, 1), config)).toBe(true); // 1st Monday
      expect(isValidOccurrence(new Date(2024, 0, 8), config)).toBe(true); // 2nd Monday
      expect(isValidOccurrence(new Date(2024, 0, 15), config)).toBe(true); // 3rd Monday
    });
  });

  describe('Monthly Frequency', () => {
    test('should return true if the day of the month matches the start date day', () => {
      const config = createConfig({
        frequency: 'monthly',
        startDate: new Date(2024, 0, 15),
      });
      expect(isValidOccurrence(new Date(2024, 0, 15), config)).toBe(true);
      expect(isValidOccurrence(new Date(2024, 1, 15), config)).toBe(true);
      expect(isValidOccurrence(new Date(2024, 11, 15), config)).toBe(true);
    });

    test('should return false if the day of the month does not match the start date day', () => {
      const config = createConfig({
        frequency: 'monthly',
        startDate: new Date(2024, 0, 15),
      });
      expect(isValidOccurrence(new Date(2024, 0, 16), config)).toBe(false);
      expect(isValidOccurrence(new Date(2024, 0, 14), config)).toBe(false);
    });
  });

  describe('Unknown Frequency', () => {
    test('should return false for unknown frequency', () => {
      const config = createConfig({ frequency: 'unknown' as any });
      expect(isValidOccurrence(new Date(2024, 0, 1), config)).toBe(false);
    });
  });
});
