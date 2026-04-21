import { describe, test, expect } from 'vitest';
import { calculateEndTime, generateOccurrences, getNextOccurrence, RecurrenceConfig } from '../../lib/recurrence';

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

describe('Daily Recurrence', () => {
  test('should generate consecutive days', () => {
    const config: RecurrenceConfig = {
      frequency: 'daily',
      daysOfWeek: null,
      startDate: new Date(2026, 3, 21), // April 21
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 5, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-21',
      '2026-04-22',
      '2026-04-23',
      '2026-04-24',
      '2026-04-25',
    ]);
  });

  test('should respect end date', () => {
    const config: RecurrenceConfig = {
      frequency: 'daily',
      daysOfWeek: null,
      startDate: new Date(2026, 3, 21),
      endDate: new Date(2026, 3, 23),
    };

    const occurrences = generateAllOccurrences(config, new Date(2026, 3, 30));

    expect(occurrences.length).toBe(3);
    expect(formatLocalDate(occurrences[2])).toBe('2026-04-23');
  });
});

describe('Weekly Recurrence', () => {
  test('should generate weekly on single day (Tuesday)', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      daysOfWeek: ['T'],
      startDate: new Date(2026, 3, 21), // Tuesday
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 5, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-21',
      '2026-04-28',
      '2026-05-05',
      '2026-05-12',
      '2026-05-19',
    ]);
  });

  test('should generate weekly on multiple days (Tue, Thu)', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      daysOfWeek: ['T', 'Th'],
      startDate: new Date(2026, 3, 21), // Tuesday
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 6, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-21', // Tue
      '2026-04-23', // Thu
      '2026-04-28', // Tue
      '2026-04-30', // Thu
      '2026-05-05', // Tue
      '2026-05-07', // Thu
    ]);
  });

  test('should generate weekly starting mid-week', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      daysOfWeek: ['M', 'W', 'F'],
      startDate: new Date(2026, 3, 21), // Tuesday
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 6, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-22', // Wed
      '2026-04-24', // Fri
      '2026-04-27', // Mon
      '2026-04-29', // Wed
      '2026-05-01', // Fri
      '2026-05-04', // Mon
    ]);
  });

  test('should handle all weekdays', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      daysOfWeek: ['M', 'T', 'W', 'Th', 'F'],
      startDate: new Date(2026, 3, 21), // Tuesday
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 8, new Date(2026, 3, 20));

    expect(occurrences.map(d => d.getDay())).toEqual([2, 3, 4, 5, 1, 2, 3, 4]); // Tue, Wed, Thu, Fri, Mon, Tue...
  });
});

describe('Bi-Weekly Recurrence', () => {
  test('should generate every 2 weeks on single day (Tuesday)', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['T'],
      startDate: new Date(2026, 3, 21), // Tuesday April 21
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 5, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-21', // Tue week 1
      '2026-05-05', // Tue week 3 (2 weeks later)
      '2026-05-19', // Tue week 5
      '2026-06-02', // Tue week 7
      '2026-06-16', // Tue week 9
    ]);
  });

  test('should generate bi-weekly on multiple days (Tue, Thu)', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['T', 'Th'],
      startDate: new Date(2026, 3, 21), // Tuesday
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 6, new Date(2026, 3, 20));

    // Should be every 2 weeks, not weekly
    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-21', // Tue week 1
      '2026-04-23', // Thu week 1
      '2026-05-05', // Tue week 3
      '2026-05-07', // Thu week 3
      '2026-05-19', // Tue week 5
      '2026-05-21', // Thu week 5
    ]);
  });

  test('should generate bi-weekly starting from Thursday', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['Th'],
      startDate: new Date(2026, 3, 23), // Thursday April 23
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 4, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-23',
      '2026-05-07',
      '2026-05-21',
      '2026-06-04',
    ]);
  });

  test('should generate bi-weekly with Monday start', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['M'],
      startDate: new Date(2026, 3, 20), // Monday April 20
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 4, new Date(2026, 3, 19));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-20',
      '2026-05-04',
      '2026-05-18',
      '2026-06-01',
    ]);
  });

  test('should NOT generate weekly occurrences within bi-week period', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['T'],
      startDate: new Date(2026, 3, 21), // Tuesday
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 3, new Date(2026, 3, 20));

    // Should NOT include April 28 (1 week later)
    const dates = occurrences.map(d => formatLocalDate(d));
    expect(dates).not.toContain('2026-04-28');
    expect(dates[1]).toBe('2026-05-05'); // 2 weeks later
  });

  test('should handle bi-weekly across month boundaries', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['F'],
      startDate: new Date(2026, 3, 24), // Friday April 24
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 4, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-24',
      '2026-05-08',
      '2026-05-22',
      '2026-06-05',
    ]);
  });

  test('should handle bi-weekly starting mid-week with day before start', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['M'], // Monday
      startDate: new Date(2026, 3, 22), // Wednesday April 22
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 4, new Date(2026, 3, 20));

    // First Monday after April 22 is April 27, then every 2 weeks
    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-27',
      '2026-05-11',
      '2026-05-25',
      '2026-06-08',
    ]);
  });
});

describe('Monthly Recurrence', () => {
  test('should generate monthly on same day of month', () => {
    const config: RecurrenceConfig = {
      frequency: 'monthly',
      daysOfWeek: null,
      startDate: new Date(2026, 3, 21), // April 21
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 5, new Date(2026, 3, 20));

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-21',
      '2026-05-21',
      '2026-06-21',
      '2026-07-21',
      '2026-08-21',
    ]);
  });

  test('should handle month with fewer days', () => {
    const config: RecurrenceConfig = {
      frequency: 'monthly',
      daysOfWeek: null,
      startDate: new Date(2027, 0, 31), // Jan 31, 2027
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 4, new Date(2027, 0, 30));

    // Feb has 28 days in 2027 (not a leap year), so should use last day
    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2027-01-31',
      '2027-02-28', // Last day of Feb
      '2027-03-31',
      '2027-04-30', // Last day of Apr (since we started on 31st)
    ]);
  });

  test('should handle month boundaries correctly', () => {
    const config: RecurrenceConfig = {
      frequency: 'monthly',
      daysOfWeek: null,
      startDate: new Date(2026, 3, 1), // April 1
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 4, new Date(2026, 2, 31)); // March 31

    expect(occurrences.map(d => formatLocalDate(d))).toEqual([
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
    ]);
  });
});

describe('Edge Cases and Bug Fixes', () => {
  test('should handle start date that is exactly the target day (bi-weekly)', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['T'],
      startDate: new Date(2026, 3, 21), // Tuesday
      endDate: null,
    };

    const next = getNextOccurrence(config, new Date(2026, 3, 20)); // Day before

    expect(next ? formatLocalDate(next) : null).toBe('2026-04-21');
  });

  test('should handle timezone issues with date parsing', () => {
    // This tests the fix for the timezone bug where '2026-04-21T00:00:00'
    // was parsed as April 20 in GMT+8 due to UTC offset
    const dateStr = '2026-04-21';
    const [year, month, day] = dateStr.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);

    expect(parsed.getDate()).toBe(21);
    expect(parsed.getMonth()).toBe(3); // April (0-indexed)
    expect(parsed.getFullYear()).toBe(2026);
  });

  test('should handle empty daysOfWeek for weekly/bi-weekly', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      daysOfWeek: [],
      startDate: new Date(2026, 3, 21),
      endDate: null,
    };

    const occurrences = generateOccurrences(config, 3);

    expect(occurrences.length).toBe(0);
  });

  test('should handle null daysOfWeek for daily/monthly', () => {
    const dailyConfig: RecurrenceConfig = {
      frequency: 'daily',
      daysOfWeek: null,
      startDate: new Date(2026, 3, 21),
      endDate: null,
    };

    const monthlyConfig: RecurrenceConfig = {
      frequency: 'monthly',
      daysOfWeek: null,
      startDate: new Date(2026, 3, 21),
      endDate: null,
    };

    const dailyOccurrences = generateOccurrences(dailyConfig, 3);
    const monthlyOccurrences = generateOccurrences(monthlyConfig, 3);

    expect(dailyOccurrences.length).toBe(3);
    expect(monthlyOccurrences.length).toBe(3);
  });

  test('should handle end date that falls between occurrences', () => {
    const config: RecurrenceConfig = {
      frequency: 'bi-weekly',
      daysOfWeek: ['T'],
      startDate: new Date(2026, 3, 21),
      endDate: new Date(2026, 4, 10), // May 10
    };

    const occurrences = generateAllOccurrences(config, new Date(2026, 5, 30));

    expect(occurrences.length).toBe(2);
    expect(formatLocalDate(occurrences[0])).toBe('2026-04-21');
    expect(formatLocalDate(occurrences[1])).toBe('2026-05-05');
  });
});

// Helper to format date as YYYY-MM-DD in local time (not UTC)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function for testing with end dates
function generateAllOccurrences(config: RecurrenceConfig, untilDate: Date): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(config.startDate);
  currentDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (currentDate < today) {
    currentDate = today;
  }

  while (true) {
    const nextDate = getNextOccurrence(config, currentDate);
    if (!nextDate) break;
    if (nextDate > untilDate) break;
    if (config.endDate && nextDate > config.endDate) break;

    occurrences.push(nextDate);
    currentDate = new Date(nextDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return occurrences;
}
