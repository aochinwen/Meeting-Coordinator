/**
 * Recurrence Engine for Meeting Coordinator
 * 
 * Generates meeting instances based on recurrence patterns:
 * - Daily: Every N days
 * - Weekly: Specific days of week (M, T, W, Th, F)
 * - Bi-Weekly: Every 2 weeks on specific days
 * - Monthly: Specific day of month
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  daysOfWeek: string[] | null; // ['M', 'T', 'W', 'Th', 'F'] or null for daily/monthly
  startDate: Date;
  endDate: Date | null; // null for infinite series
}

const DAY_MAP: Record<string, number> = {
  'Su': 0, // Sunday
  'M': 1,  // Monday
  'T': 2,  // Tuesday
  'W': 3,  // Wednesday
  'Th': 4, // Thursday
  'F': 5,  // Friday
  'Sa': 6, // Saturday
};

const REVERSE_DAY_MAP: Record<number, string> = {
  0: 'Su',
  1: 'M',
  2: 'T',
  3: 'W',
  4: 'Th',
  5: 'F',
  6: 'Sa',
};

/**
 * Generate the next N occurrence dates for a recurrence pattern
 */
export function generateOccurrences(
  config: RecurrenceConfig,
  count: number,
  afterDate: Date = new Date()
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(afterDate);
  currentDate.setHours(0, 0, 0, 0);
  
  // Start from the day after the given date
  currentDate.setDate(currentDate.getDate() + 1);
  
  while (occurrences.length < count) {
    const nextDate = getNextOccurrence(config, currentDate);
    if (!nextDate) break;
    
    // Check if we've exceeded the end date
    if (config.endDate && nextDate > config.endDate) break;
    
    // Only add if not already in list (avoid duplicates)
    if (!occurrences.some(d => d.getTime() === nextDate.getTime())) {
      occurrences.push(nextDate);
    }
    
    // Move to next day
    currentDate = new Date(nextDate);
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Safety check to prevent infinite loops
    if (occurrences.length >= count) break;
  }
  
  return occurrences;
}

/**
 * Generate all occurrence dates until a specified end date
 */
export function generateAllOccurrences(
  config: RecurrenceConfig,
  untilDate: Date
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(config.startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  // If start date is in the future, use it; otherwise use today
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

/**
 * Find the next occurrence after a given date
 */
export function getNextOccurrence(
  config: RecurrenceConfig,
  afterDate: Date
): Date | null {
  const startDate = new Date(config.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(afterDate);
  checkDate.setHours(0, 0, 0, 0);
  
  // If we're before the start date, return the start date if it matches
  if (checkDate <= startDate) {
    if (isValidOccurrence(startDate, config)) {
      return startDate;
    }
  }
  
  switch (config.frequency) {
    case 'daily':
      return getNextDailyOccurrence(checkDate, config);
    case 'weekly':
      return getNextWeeklyOccurrence(checkDate, config);
    case 'bi-weekly':
      return getNextBiWeeklyOccurrence(checkDate, config, startDate);
    case 'monthly':
      return getNextMonthlyOccurrence(checkDate, config, startDate);
    default:
      return null;
  }
}

/**
 * Return which Nth occurrence of a weekday a date is within its month.
 * e.g. April 22 (4th Wednesday) → { weekday: 3, n: 4 }
 */
function getMonthlyWeekdayPattern(date: Date): { weekday: number; n: number } {
  const weekday = date.getDay();
  const n = Math.ceil(date.getDate() / 7);
  return { weekday, n };
}

/**
 * Return the date of the Nth occurrence of `weekday` in the given year/month.
 * If the Nth occurrence overflows the month, returns the last occurrence instead.
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  // Find the first occurrence of weekday in the month
  const firstOfMonth = new Date(year, month, 1);
  let daysToFirst = weekday - firstOfMonth.getDay();
  if (daysToFirst < 0) daysToFirst += 7;
  const firstOccurrence = 1 + daysToFirst;

  const targetDay = firstOccurrence + (n - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // If target overflows the month, fall back to the last valid occurrence
  const actualDay = targetDay <= daysInMonth ? targetDay : targetDay - 7;
  return new Date(year, month, actualDay);
}

/**
 * Check if a specific date matches the recurrence pattern
 */
export function isValidOccurrence(date: Date, config: RecurrenceConfig): boolean {
  switch (config.frequency) {
    case 'daily':
      return true;
    case 'weekly':
    case 'bi-weekly':
      if (!config.daysOfWeek || config.daysOfWeek.length === 0) return false;
      const dayOfWeek = date.getDay();
      const dayCode = REVERSE_DAY_MAP[dayOfWeek];
      return config.daysOfWeek.includes(dayCode);
    case 'monthly': {
      const { weekday, n } = getMonthlyWeekdayPattern(config.startDate);
      const expected = getNthWeekdayOfMonth(date.getFullYear(), date.getMonth(), weekday, n);
      return date.getDate() === expected.getDate();
    }
    default:
      return false;
  }
}

/**
 * Get next daily occurrence (simply the next day)
 */
function getNextDailyOccurrence(
  afterDate: Date,
  config: RecurrenceConfig
): Date | null {
  const nextDate = new Date(afterDate);
  return nextDate;
}

/**
 * Get next weekly occurrence based on days of week
 */
function getNextWeeklyOccurrence(
  afterDate: Date,
  config: RecurrenceConfig
): Date | null {
  if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
    return null;
  }
  
  // Convert day codes to day numbers and sort
  const targetDays = config.daysOfWeek
    .map(day => DAY_MAP[day])
    .filter(day => day !== undefined)
    .sort((a, b) => a - b);
  
  if (targetDays.length === 0) return null;
  
  const currentDay = afterDate.getDay();

  // Find the next target day (allow same day for initial generation)
  let daysToAdd = 0;
  let foundNextDay = false;

  // Check remaining days of this week including current day
  for (const targetDay of targetDays) {
    if (targetDay >= currentDay) {
      daysToAdd = targetDay - currentDay;
      foundNextDay = true;
      break;
    }
  }

  // If no day found this week, wrap to first day of next week
  if (!foundNextDay) {
    const firstDay = targetDays[0];
    daysToAdd = (7 - currentDay) + firstDay;
  }

  const nextDate = new Date(afterDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}

/**
 * Get next bi-weekly occurrence (every 2 weeks on specific days)
 * Generates occurrences every 2 weeks on the specified days
 */
function getNextBiWeeklyOccurrence(
  afterDate: Date,
  config: RecurrenceConfig,
  seriesStartDate: Date
): Date | null {
  if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
    return null;
  }

  // Convert day codes to day numbers and sort
  const targetDays = config.daysOfWeek
    .map(day => DAY_MAP[day])
    .filter(day => day !== undefined)
    .sort((a, b) => a - b);

  if (targetDays.length === 0) return null;

  const msPerDay = 24 * 60 * 60 * 1000;

  // For each target day, calculate its first occurrence from series start
  // Then find which bi-week period we're in and return the appropriate occurrence

  // Get the earliest first occurrence among all target days
  let earliestFirstOccurrence: Date | null = null;
  const firstOccurrences: Date[] = [];

  for (const targetDay of targetDays) {
    let daysToFirst = targetDay - seriesStartDate.getDay();
    if (daysToFirst < 0) {
      daysToFirst += 7;
    }
    const firstOccurrence = new Date(seriesStartDate);
    firstOccurrence.setDate(seriesStartDate.getDate() + daysToFirst);
    firstOccurrences.push(firstOccurrence);

    if (!earliestFirstOccurrence || firstOccurrence < earliestFirstOccurrence) {
      earliestFirstOccurrence = firstOccurrence;
    }
  }

  if (!earliestFirstOccurrence) return null;

  // Calculate days from the earliest first occurrence
  const daysSinceEarliest = Math.floor(
    (afterDate.getTime() - earliestFirstOccurrence.getTime()) / msPerDay
  );

  // Calculate current bi-week number (0-indexed)
  const currentBiWeekNumber = Math.max(0, Math.floor(daysSinceEarliest / 14));

  // Find all candidate dates in the current and next bi-weeks
  const candidates: Date[] = [];

  // Check current bi-week
  for (let i = 0; i < firstOccurrences.length; i++) {
    const candidate = new Date(firstOccurrences[i]);
    candidate.setDate(firstOccurrences[i].getDate() + currentBiWeekNumber * 14);

    if (candidate > afterDate) {
      candidates.push(candidate);
    }
  }

  // Check next bi-week if no candidates in current
  if (candidates.length === 0) {
    for (let i = 0; i < firstOccurrences.length; i++) {
      const candidate = new Date(firstOccurrences[i]);
      candidate.setDate(firstOccurrences[i].getDate() + (currentBiWeekNumber + 1) * 14);
      candidates.push(candidate);
    }
  }

  // Return the earliest candidate
  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] || null;
}

/**
 * Get next monthly occurrence (same Nth weekday of month as the series start date)
 * e.g. if start date is the 4th Wednesday, recurs on the 4th Wednesday of each month.
 */
function getNextMonthlyOccurrence(
  afterDate: Date,
  config: RecurrenceConfig,
  seriesStartDate: Date
): Date | null {
  const { weekday, n } = getMonthlyWeekdayPattern(seriesStartDate);

  // Check if this month's occurrence is still after afterDate
  const candidateThisMonth = getNthWeekdayOfMonth(
    afterDate.getFullYear(),
    afterDate.getMonth(),
    weekday,
    n
  );

  if (candidateThisMonth > afterDate) {
    return candidateThisMonth;
  }

  // Otherwise use next month
  const nextMonthDate = new Date(afterDate.getFullYear(), afterDate.getMonth() + 1, 1);
  return getNthWeekdayOfMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), weekday, n);
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrencePattern(
  frequency: RecurrenceFrequency,
  daysOfWeek: string[] | null
): string {
  switch (frequency) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      if (!daysOfWeek || daysOfWeek.length === 0) return 'Weekly';
      if (daysOfWeek.length === 5 && 
          daysOfWeek.every(d => ['M', 'T', 'W', 'Th', 'F'].includes(d))) {
        return 'Every weekday';
      }
      return `Every week on ${daysOfWeek.join(', ')}`;
    case 'bi-weekly':
      if (!daysOfWeek || daysOfWeek.length === 0) return 'Bi-weekly';
      return `Every 2 weeks on ${daysOfWeek.join(', ')}`;
    case 'monthly':
      return 'Every month';
    default:
      return 'Recurring';
  }
}

/**
 * Get the date of the Nth occurrence after startDate.
 * Returns null if the series has fewer than count occurrences within a safety limit.
 */
export function getEndDateForCount(
  config: RecurrenceConfig,
  count: number
): Date | null {
  const occurrences: Date[] = [];
  let currentDate = new Date(config.startDate);
  currentDate.setHours(0, 0, 0, 0);
  // Start one day before so the startDate itself can be the first occurrence
  currentDate.setDate(currentDate.getDate() - 1);

  const MAX_ITERATIONS = 10000;
  let iterations = 0;

  while (occurrences.length < count && iterations < MAX_ITERATIONS) {
    iterations++;
    const nextDate = getNextOccurrence(config, currentDate);
    if (!nextDate) break;
    occurrences.push(nextDate);
    currentDate = new Date(nextDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return occurrences.length >= count ? occurrences[count - 1] : null;
}

/**
 * Calculate end time based on start time and duration
 */
export function calculateEndTime(
  startTime: string, // "HH:MM" format
  durationMinutes: number
): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
