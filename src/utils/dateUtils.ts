/**
 * Utility functions for date manipulation and formatting
 */

/**
 * Get the start of a time unit for a given date
 */
export function getStartOf(date: Date, unit: 'century' | 'decade' | 'year' | 'month' | 'week' | 'day' | 'halfday' | 'quarterday' | 'hour' | 'halfhour' | 'quarterhour' | 'minute' | 'halfminute' | 'quarterminute' | 'second' | 'millisecond'): Date {
  const d = new Date(date);

  switch (unit) {
    case 'century': {
      const year = d.getFullYear();
      const centuryStart = Math.floor(year / 100) * 100;
      d.setFullYear(centuryStart, 0, 1);
      d.setHours(0, 0, 0, 0);
      break;
    }
    case 'decade': {
      const year = d.getFullYear();
      const decadeStart = Math.floor(year / 10) * 10;
      d.setFullYear(decadeStart, 0, 1);
      d.setHours(0, 0, 0, 0);
      break;
    }
    case 'year':
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'month':
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      break;
    }
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'halfday': {
      // Round down to nearest 12-hour block (0:00 or 12:00)
      const hour = d.getHours();
      const halfDayHour = hour < 12 ? 0 : 12;
      d.setHours(halfDayHour, 0, 0, 0);
      break;
    }
    case 'quarterday': {
      // Round down to nearest 6-hour block (0:00, 6:00, 12:00, or 18:00)
      const hour = d.getHours();
      const quarterDayHour = Math.floor(hour / 6) * 6;
      d.setHours(quarterDayHour, 0, 0, 0);
      break;
    }
    case 'hour':
      d.setMinutes(0, 0, 0);
      break;
    case 'halfhour': {
      // Round down to nearest 30-minute block
      const minute = d.getMinutes();
      const halfHourMinute = minute < 30 ? 0 : 30;
      d.setMinutes(halfHourMinute, 0, 0);
      break;
    }
    case 'quarterhour': {
      // Round down to nearest 15-minute block
      const minute = d.getMinutes();
      const quarterHourMinute = Math.floor(minute / 15) * 15;
      d.setMinutes(quarterHourMinute, 0, 0);
      break;
    }
    case 'minute':
      d.setSeconds(0, 0);
      break;
    case 'halfminute': {
      // Round down to nearest 30-second block
      const second = d.getSeconds();
      const halfMinuteSecond = second < 30 ? 0 : 30;
      d.setSeconds(halfMinuteSecond, 0);
      break;
    }
    case 'quarterminute': {
      // Round down to nearest 15-second block
      const second = d.getSeconds();
      const quarterMinuteSecond = Math.floor(second / 15) * 15;
      d.setSeconds(quarterMinuteSecond, 0);
      break;
    }
    case 'second':
      d.setMilliseconds(0);
      break;
    case 'millisecond':
      // Already at millisecond precision
      break;
  }

  return d;
}

/**
 * Add time to a date
 */
export function addTime(
  date: Date,
  amount: number,
  unit: 'century' | 'decade' | 'year' | 'month' | 'week' | 'day' | 'halfday' | 'quarterday' | 'hour' | 'halfhour' | 'quarterhour' | 'minute' | 'halfminute' | 'quarterminute' | 'second' | 'millisecond'
): Date {
  const d = new Date(date);

  switch (unit) {
    case 'century':
      d.setFullYear(d.getFullYear() + amount * 100);
      break;
    case 'decade':
      d.setFullYear(d.getFullYear() + amount * 10);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + amount);
      break;
    case 'month':
      d.setMonth(d.getMonth() + amount);
      break;
    case 'week':
      d.setDate(d.getDate() + amount * 7);
      break;
    case 'day':
      d.setDate(d.getDate() + amount);
      break;
    case 'halfday':
      d.setHours(d.getHours() + amount * 12);
      break;
    case 'quarterday':
      d.setHours(d.getHours() + amount * 6);
      break;
    case 'hour':
      d.setHours(d.getHours() + amount);
      break;
    case 'halfhour':
      d.setMinutes(d.getMinutes() + amount * 30);
      break;
    case 'quarterhour':
      d.setMinutes(d.getMinutes() + amount * 15);
      break;
    case 'minute':
      d.setMinutes(d.getMinutes() + amount);
      break;
    case 'halfminute':
      d.setSeconds(d.getSeconds() + amount * 30);
      break;
    case 'quarterminute':
      d.setSeconds(d.getSeconds() + amount * 15);
      break;
    case 'second':
      d.setSeconds(d.getSeconds() + amount);
      break;
    case 'millisecond':
      d.setMilliseconds(d.getMilliseconds() + amount);
      break;
  }

  return d;
}

/**
 * Get the end timestamp for a time unit period
 */
export function getEndOfPeriod(startTimestamp: number, unit: 'century' | 'decade' | 'year' | 'month' | 'week' | 'day' | 'halfday' | 'quarterday' | 'hour' | 'halfhour' | 'quarterhour' | 'minute' | 'halfminute' | 'quarterminute' | 'second' | 'millisecond'): number {
  const startDate = new Date(startTimestamp);
  const endDate = addTime(startDate, 1, unit);
  return endDate.getTime();
}

/**
 * Format a date according to time unit
 */
export function formatTimeUnit(date: Date, unit: string): string {
  switch (unit) {
    case 'century': {
      const year = date.getFullYear();
      const centuryStart = Math.floor(year / 100) * 100;
      const centuryEnd = centuryStart + 99;
      return `${centuryStart}-${centuryEnd}`;
    }
    case 'decade': {
      const year = date.getFullYear();
      const decadeStart = Math.floor(year / 10) * 10;
      return `${decadeStart}s`;
    }
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short' });
    case 'week':
      return `W${getWeekNumber(date)}`;
    case 'day':
      return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    case 'halfday': {
      const hour = date.getHours();
      return hour < 12 ? 'AM' : 'PM';
    }
    case 'quarterday':
      return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false }) + ':00';
    case 'hour':
      return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false });
    case 'halfhour':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'quarterhour':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'minute':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'halfminute':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    case 'quarterminute':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    case 'second':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    default:
      return date.toISOString();
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Time unit durations in milliseconds (approximate for month/year/decade/century)
 */
export const TIME_UNIT_MS = {
  millisecond: 1,
  second: 1000,
  quarterminute: 15 * 1000, // 15 seconds
  halfminute: 30 * 1000, // 30 seconds
  minute: 60 * 1000,
  quarterhour: 15 * 60 * 1000, // 15 minutes
  halfhour: 30 * 60 * 1000, // 30 minutes
  hour: 60 * 60 * 1000,
  quarterday: 6 * 60 * 60 * 1000, // 6 hours
  halfday: 12 * 60 * 60 * 1000, // 12 hours
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000, // Approximate
  year: 365 * 24 * 60 * 60 * 1000, // Approximate
  decade: 10 * 365 * 24 * 60 * 60 * 1000, // Approximate
  century: 100 * 365 * 24 * 60 * 60 * 1000, // Approximate
} as const;

/**
 * Convert a human-readable time span to pixelsPerMs for zoom configuration
 *
 * @param timeSpan - Examples: "1 year", "6 months", "2 weeks", "1 day", "12 hours"
 * @param containerWidth - The width of the timeline container in pixels (default: 1400)
 * @returns The pixelsPerMs value for that time span
 *
 * @example
 * // To show 1 year in the viewport at this zoom level:
 * const maxZoomOut = timeSpanToZoom("1 year");
 *
 * // To show 1 hour in the viewport at this zoom level:
 * const maxZoomIn = timeSpanToZoom("1 hour");
 */
export function timeSpanToZoom(timeSpan: string, containerWidth: number = 1400): number {
  // Parse the time span string
  const parts = timeSpan.trim().toLowerCase().split(/\s+/);

  if (parts.length !== 2) {
    throw new Error(`Invalid time span format: "${timeSpan}". Expected format: "1 year", "6 months", etc.`);
  }

  const amount = parseFloat(parts[0]);
  const unit = parts[1];

  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid time amount: "${parts[0]}". Must be a positive number.`);
  }

  // Normalize unit (handle plural forms)
  let normalizedUnit = unit.replace(/s$/, ''); // Remove trailing 's'

  // Map common variations
  const unitMap: Record<string, keyof typeof TIME_UNIT_MS> = {
    'year': 'year',
    'month': 'month',
    'week': 'week',
    'day': 'day',
    'hour': 'hour',
    'minute': 'minute',
    'second': 'second',
    'millisecond': 'millisecond',
    'ms': 'millisecond',
    'sec': 'second',
    'min': 'minute',
    'hr': 'hour',
    'wk': 'week',
    'mo': 'month',
    'yr': 'year',
  };

  const timeUnit = unitMap[normalizedUnit];

  if (!timeUnit) {
    throw new Error(`Invalid time unit: "${unit}". Valid units: year, month, week, day, hour, minute, second, millisecond`);
  }

  // Calculate the total milliseconds for this time span
  const totalMs = TIME_UNIT_MS[timeUnit] * amount;

  // Calculate pixelsPerMs: if we want this time span to fit in containerWidth pixels,
  // then pixelsPerMs = containerWidth / totalMs
  return containerWidth / totalMs;
}
