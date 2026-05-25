import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidOccurrence, type RecurrenceConfig } from '../../lib/recurrence.ts';

describe('isValidOccurrence', () => {
  const createConfig = (overrides: Partial<RecurrenceConfig>): RecurrenceConfig => ({
    frequency: 'daily',
    daysOfWeek: null,
    startDate: new Date('2024-01-01'),
    endDate: null,
    ...overrides,
  });

  describe('Daily Frequency', () => {
    it('should return true for any date', () => {
      const config = createConfig({ frequency: 'daily' });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-01'), config), true, 'True for start date');
      assert.strictEqual(isValidOccurrence(new Date('2024-01-02'), config), true, 'True for next day');
      assert.strictEqual(isValidOccurrence(new Date('2024-12-31'), config), true, 'True for any random date');
    });
  });

  describe('Weekly Frequency', () => {
    it('should return true if the date matches one of the specified days of the week', () => {
      const config = createConfig({
        frequency: 'weekly',
        daysOfWeek: ['M', 'W', 'F'],
      });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-01'), config), true, 'Monday (2024-01-01) matches');
      assert.strictEqual(isValidOccurrence(new Date('2024-01-03'), config), true, 'Wednesday (2024-01-03) matches');
      assert.strictEqual(isValidOccurrence(new Date('2024-01-05'), config), true, 'Friday (2024-01-05) matches');
    });

    it('should return false if the date does not match any of the specified days of the week', () => {
      const config = createConfig({
        frequency: 'weekly',
        daysOfWeek: ['M', 'W', 'F'],
      });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-02'), config), false, 'Tuesday (2024-01-02) does not match');
      assert.strictEqual(isValidOccurrence(new Date('2024-01-04'), config), false, 'Thursday (2024-01-04) does not match');
    });

    it('should return false if daysOfWeek is empty', () => {
      const config = createConfig({
        frequency: 'weekly',
        daysOfWeek: [],
      });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-01'), config), false, 'Monday returns false for empty daysOfWeek');
    });

    it('should return false if daysOfWeek is null', () => {
      const config = createConfig({
        frequency: 'weekly',
        daysOfWeek: null,
      });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-01'), config), false, 'Monday returns false for null daysOfWeek');
    });
  });

  describe('Bi-Weekly Frequency', () => {
    // Current implementation behaves like weekly
    it('should return true if the date matches one of the specified days of the week', () => {
      const config = createConfig({
        frequency: 'bi-weekly',
        daysOfWeek: ['M'],
        startDate: new Date('2024-01-01'),
      });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-01'), config), true, 'First Monday matches');
      assert.strictEqual(isValidOccurrence(new Date('2024-01-08'), config), true, 'Second Monday matches (current implementation)');
      assert.strictEqual(isValidOccurrence(new Date('2024-01-15'), config), true, 'Third Monday matches (current implementation)');
    });
  });

  describe('Monthly Frequency', () => {
    it('should return true if the day of the month matches the start date day', () => {
      const config = createConfig({
        frequency: 'monthly',
        startDate: new Date('2024-01-15'),
      });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-15'), config), true, '15th of same month matches');
      assert.strictEqual(isValidOccurrence(new Date('2024-02-15'), config), true, '15th of next month matches');
      assert.strictEqual(isValidOccurrence(new Date('2024-12-15'), config), true, '15th of any month matches');
    });

    it('should return false if the day of the month does not match the start date day', () => {
      const config = createConfig({
        frequency: 'monthly',
        startDate: new Date('2024-01-15'),
      });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-16'), config), false, '16th does not match 15th');
      assert.strictEqual(isValidOccurrence(new Date('2024-01-14'), config), false, '14th does not match 15th');
    });
  });

  describe('Unknown Frequency', () => {
    it('should return false for unknown frequency', () => {
      const config = createConfig({ frequency: 'unknown' as any });
      assert.strictEqual(isValidOccurrence(new Date('2024-01-01'), config), false);
    });
  });
});
