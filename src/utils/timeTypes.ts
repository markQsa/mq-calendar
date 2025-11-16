/**
 * Time value types and converters
 */

/**
 * Represents a point in time - flexible input types
 */
export type TimeValue = Date | number | string;

/**
 * Represents a duration - can be milliseconds or human-readable string
 * Examples:
 * - 86400000 (number in milliseconds)
 * - "1 day"
 * - "2 hours"
 * - "30 minutes"
 * - "1 week 2 days"
 */
export type DurationValue = number | string;

/**
 * Interface for custom time converters
 * Allows users to plug in their own time libraries (Day.js, Luxon, etc.)
 */
export interface TimeConverter {
  /**
   * Convert any time value to Unix timestamp (milliseconds)
   */
  toTimestamp: (value: unknown) => number;

  /**
   * Convert Unix timestamp to preferred time format
   */
  fromTimestamp: (timestamp: number) => unknown;

  /**
   * Parse duration to milliseconds
   */
  parseDuration?: (duration: DurationValue) => number;

  /**
   * Format timestamp for display
   */
  formatTime?: (timestamp: number, format: string) => string;
}
