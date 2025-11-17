import type { AvailabilityConfig, DailyTimeRange, WeeklyPattern, SimplePattern } from '../react/types';

/**
 * Parse time of day string (HH:MM) to milliseconds since midnight
 */
export function parseTimeOfDay(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60 + minutes) * 60 * 1000;
}

/**
 * Check if a timestamp falls within a specific time range
 */
export function isInSpecificRange(timestamp: number, start: number, end: number): boolean {
  return timestamp >= start && timestamp <= end;
}

/**
 * Check if a timestamp falls within daily time ranges for a given date
 */
export function isInDailyRanges(timestamp: number, ranges: DailyTimeRange[]): boolean {
  const date = new Date(timestamp);
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const timeOfDay = timestamp - dayStart;

  for (const range of ranges) {
    const startTime = parseTimeOfDay(range.start);
    const endTime = parseTimeOfDay(range.end);

    if (timeOfDay >= startTime && timeOfDay <= endTime) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a timestamp is available according to weekly pattern
 */
export function isAvailableInWeeklyPattern(timestamp: number, weekly: WeeklyPattern): boolean {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  const ranges = weekly[dayOfWeek];

  if (!ranges || ranges.length === 0) {
    return false;
  }

  return isInDailyRanges(timestamp, ranges);
}

/**
 * Check if a timestamp is available according to simple pattern
 */
export function isAvailableInSimplePattern(timestamp: number, simple: SimplePattern): boolean {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const ranges = isWeekend ? simple.weekends : simple.weekdays;

  if (!ranges || ranges.length === 0) {
    return false;
  }

  return isInDailyRanges(timestamp, ranges);
}

/**
 * Check if a timestamp is available according to availability configuration
 */
export function isAvailable(timestamp: number, config: AvailabilityConfig): boolean {
  // Check specific ranges first (highest priority)
  if (config.specific && config.specific.length > 0) {
    for (const range of config.specific) {
      const start = typeof range.start === 'number' ? range.start : new Date(range.start).getTime();
      const end = typeof range.end === 'number' ? range.end : new Date(range.end).getTime();

      if (isInSpecificRange(timestamp, start, end)) {
        return true;
      }
    }
  }

  // Check weekly pattern
  if (config.weekly) {
    return isAvailableInWeeklyPattern(timestamp, config.weekly);
  }

  // Check simple pattern
  if (config.simple) {
    return isAvailableInSimplePattern(timestamp, config.simple);
  }

  // Default: available if no patterns specified
  return true;
}

/**
 * Calculate available time ranges within a viewport
 * Returns array of [start, end] timestamps representing available periods
 */
export function calculateAvailableRanges(
  viewportStart: number,
  viewportEnd: number,
  config: AvailabilityConfig,
  granularity: number = 60000 // 1 minute default
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let rangeStart: number | null = null;

  for (let timestamp = viewportStart; timestamp <= viewportEnd; timestamp += granularity) {
    const available = isAvailable(timestamp, config);

    if (available && rangeStart === null) {
      // Start of a new available range
      rangeStart = timestamp;
    } else if (!available && rangeStart !== null) {
      // End of available range
      ranges.push([rangeStart, timestamp - granularity]);
      rangeStart = null;
    }
  }

  // Close last range if still open
  if (rangeStart !== null) {
    ranges.push([rangeStart, viewportEnd]);
  }

  return ranges;
}
