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
    case 'monthly':
      const startDay = config.startDate.getDate();
      return date.getDate() === startDay;
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
    if (targetDay > currentDay) {
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
 */
function getNextBiWeeklyOccurrence(
  afterDate: Date,
  config: RecurrenceConfig,
  seriesStartDate: Date
): Date | null {
  if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
    return null;
  }
  
  // Calculate which bi-week period we're in
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceStart = Math.floor(
    (afterDate.getTime() - seriesStartDate.getTime()) / msPerDay
  );
  const currentBiWeekNumber = Math.floor(daysSinceStart / 14);
  
  // Get the start of the current bi-week period
  const currentBiWeekStart = new Date(seriesStartDate);
  currentBiWeekStart.setDate(
    currentBiWeekStart.getDate() + currentBiWeekNumber * 14
  );
  
  // Convert day codes to day numbers
  const targetDays = config.daysOfWeek
    .map(day => DAY_MAP[day])
    .filter(day => day !== undefined)
    .sort((a, b) => a - b);
  
  if (targetDays.length === 0) return null;
  
  // Find the next occurrence in the current bi-week
  const currentDay = afterDate.getDay();
  const daysSinceBiWeekStart = Math.floor(
    (afterDate.getTime() - currentBiWeekStart.getTime()) / msPerDay
  );
  
  // Check if we're still in the first week of the bi-week
  if (daysSinceBiWeekStart < 7) {
    for (const targetDay of targetDays) {
      if (targetDay > currentDay) {
        const daysToAdd = targetDay - currentDay;
        const nextDate = new Date(afterDate);
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        return nextDate;
      }
    }
  }
  
  // Check second week of the bi-week
  if (daysSinceBiWeekStart < 14) {
    for (const targetDay of targetDays) {
      const adjustedTargetDay = targetDay + 7;
      if (adjustedTargetDay > daysSinceBiWeekStart) {
        const daysToAdd = adjustedTargetDay - daysSinceBiWeekStart;
        const nextDate = new Date(afterDate);
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        return nextDate;
      }
    }
  }
  
  // Move to next bi-week period
  const nextBiWeekStart = new Date(currentBiWeekStart);
  nextBiWeekStart.setDate(nextBiWeekStart.getDate() + 14);
  
  // Find the first target day in the next bi-week
  const firstTargetDay = targetDays[0];
  const daysToFirstTarget = firstTargetDay - nextBiWeekStart.getDay();
  
  const nextDate = new Date(nextBiWeekStart);
  nextDate.setDate(nextDate.getDate() + daysToFirstTarget);
  
  return nextDate;
}

/**
 * Get next monthly occurrence (same day of month)
 */
function getNextMonthlyOccurrence(
  afterDate: Date,
  config: RecurrenceConfig,
  seriesStartDate: Date
): Date | null {
  const targetDay = seriesStartDate.getDate();
  
  // Start from the next month
  const nextDate = new Date(afterDate);
  nextDate.setDate(1); // Set to first of month
  nextDate.setMonth(nextDate.getMonth() + 1); // Move to next month
  
  // Try to set the target day
  const daysInMonth = new Date(
    nextDate.getFullYear(),
    nextDate.getMonth() + 1,
    0
  ).getDate();
  
  if (targetDay <= daysInMonth) {
    nextDate.setDate(targetDay);
  } else {
    // If target day doesn't exist (e.g., 31st in a 30-day month), use last day
    nextDate.setDate(daysInMonth);
  }
  
  return nextDate;
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
