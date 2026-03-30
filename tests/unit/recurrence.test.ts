import { describe, test, expect } from 'vitest';
import { calculateEndTime } from '../../lib/recurrence';

describe('calculateEndTime', () => {
  describe('Happy Path', () => {
    test('should add 30 minutes', () => {
      expect(calculateEndTime('10:00', 30)).toBe('10:30');
    });

    test('should wrap to next hour', () => {
      expect(calculateEndTime('09:15', 45)).toBe('10:00');
    });
  });

  describe('Edge Case: Duration is 0', () => {
    test('should return same time if duration is 0', () => {
      expect(calculateEndTime('14:00', 0)).toBe('14:00');
    });
  });

  describe('Edge Case: Long duration', () => {
    test('should add multiple hours', () => {
      expect(calculateEndTime('08:00', 120)).toBe('10:00');
    });

    test('should add hours and minutes', () => {
      expect(calculateEndTime('08:00', 150)).toBe('10:30');
    });
  });

  describe('Edge Case: Wrap around midnight', () => {
    test('should wrap around midnight', () => {
      expect(calculateEndTime('23:00', 120)).toBe('01:00');
    });

    test('should wrap around midnight and show 00 hours', () => {
      expect(calculateEndTime('23:30', 60)).toBe('00:30');
    });
  });

  describe('Edge Case: Very long duration (more than 24h)', () => {
    test('should wrap around multiple days (1 day)', () => {
      expect(calculateEndTime('10:00', 1440)).toBe('10:00');
    });

    test('should wrap around multiple days (1 day + 1 hour)', () => {
      expect(calculateEndTime('10:00', 1500)).toBe('11:00');
    });
  });
});
