/**
 * Default time converter using date-fns
 */

import { parseISO, format as dateFnsFormat } from 'date-fns';
import type { TimeValue, DurationValue, TimeConverter as ITimeConverter } from './timeTypes';

/**
 * Convert TimeValue to Unix timestamp (milliseconds)
 */
export function toTimestamp(value: TimeValue): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Try parsing as ISO string
    const date = parseISO(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
    // Fallback to Date constructor
    return new Date(value).getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  throw new Error(`Invalid time value: ${value}`);
}

/**
 * Convert Unix timestamp to Date
 */
export function fromTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Parse duration string to milliseconds
 * Supports formats like:
 * - "1 day", "2 days"
 * - "3 hours", "3 hour", "3h"
 * - "30 minutes", "30 mins", "30m"
 * - "45 seconds", "45 secs", "45s"
 * - "1 week", "1w"
 * - "1 month" (30 days)
 * - "1 year" (365 days)
 * - Combinations: "1 day 2 hours 30 minutes"
 */
export function parseDuration(duration: DurationValue): number {
  // If already a number, return as-is (assumed to be milliseconds)
  if (typeof duration === 'number') {
    return duration;
  }

  // Parse string duration
  const str = duration.toLowerCase().trim();
  let totalMs = 0;

  // Time unit mappings
  const units: Record<string, number> = {
    millisecond: 1,
    milliseconds: 1,
    ms: 1,
    second: 1000,
    seconds: 1000,
    sec: 1000,
    secs: 1000,
    s: 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    min: 60 * 1000,
    mins: 60 * 1000,
    m: 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hrs: 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000
  };

  // Match patterns like "1 day", "2 hours", etc.
  const regex = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2];

    if (units[unit] !== undefined) {
      totalMs += value * units[unit];
    } else {
      console.warn(`Unknown duration unit: ${unit}`);
    }
  }

  if (totalMs === 0) {
    throw new Error(`Unable to parse duration: ${duration}`);
  }

  return totalMs;
}

/**
 * Format timestamp using date-fns
 */
export function formatTime(timestamp: number, formatStr: string = 'PPpp'): string {
  return dateFnsFormat(new Date(timestamp), formatStr);
}

/**
 * Default time converter using date-fns
 */
export const defaultTimeConverter: ITimeConverter = {
  toTimestamp: (value: unknown) => toTimestamp(value as TimeValue),
  fromTimestamp,
  parseDuration,
  formatTime
};

/**
 * Create a custom time converter
 * This allows users to use other libraries like Day.js, Luxon, etc.
 */
export function createTimeConverter(converter: Partial<ITimeConverter>): ITimeConverter {
  return {
    toTimestamp: converter.toTimestamp || ((value: unknown) => toTimestamp(value as TimeValue)),
    fromTimestamp: converter.fromTimestamp || fromTimestamp,
    parseDuration: converter.parseDuration || parseDuration,
    formatTime: converter.formatTime || formatTime
  };
}
