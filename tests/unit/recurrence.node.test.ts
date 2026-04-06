import assert from 'node:assert';
import { test, describe } from 'node:test';
import { calculateEndTime } from '../../lib/recurrence.ts';

describe('calculateEndTime', () => {
  describe('Happy Path', () => {
    test('should add 30 minutes', () => {
      assert.strictEqual(calculateEndTime('10:00', 30), '10:30');
    });

    test('should wrap to next hour', () => {
      assert.strictEqual(calculateEndTime('09:15', 45), '10:00');
    });
  });

  describe('Edge Case: Duration is 0', () => {
    test('should return same time if duration is 0', () => {
      assert.strictEqual(calculateEndTime('14:00', 0), '14:00');
    });
  });

  describe('Edge Case: Long duration', () => {
    test('should add multiple hours', () => {
      assert.strictEqual(calculateEndTime('08:00', 120), '10:00');
    });

    test('should add hours and minutes', () => {
      assert.strictEqual(calculateEndTime('08:00', 150), '10:30');
    });
  });

  describe('Edge Case: Wrap around midnight', () => {
    test('should wrap around midnight', () => {
      assert.strictEqual(calculateEndTime('23:00', 120), '01:00');
    });

    test('should wrap around midnight and show 00 hours', () => {
      assert.strictEqual(calculateEndTime('23:30', 60), '00:30');
    });
  });

  describe('Edge Case: Very long duration (more than 24h)', () => {
    test('should wrap around multiple days (1 day)', () => {
      assert.strictEqual(calculateEndTime('10:00', 1440), '10:00');
    });

    test('should wrap around multiple days (1 day + 1 hour)', () => {
      assert.strictEqual(calculateEndTime('10:00', 1500), '11:00');
    });
  });
});
