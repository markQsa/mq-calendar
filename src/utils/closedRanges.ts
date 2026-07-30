/**
 * Derive the closed (non-opening-hours) periods of an `AvailabilityConfig`
 * as absolute time ranges.
 *
 * Used by `<TimelineCalendar compressClosedHours>` to shrink the parts of the
 * time axis where nothing can be scheduled. The opening-hours semantics match
 * `isAvailable()` in `availabilityUtils` so that the compressed strips line up
 * with the `<AvailabilityOverlay>` shading:
 *
 * - `weekly` takes precedence over `simple` when both are given
 * - `specific` ranges add availability on top of the pattern
 * - a config with neither `weekly` nor `simple` is "always open", so nothing
 *   is compressed
 */

import type { AvailabilityConfig, DailyTimeRange } from '../react/types';
import type { CompressedRange } from '../core/types';

const MS_PER_MINUTE = 60 * 1000;

/** Safety valve: never walk more than this many days when resolving ranges */
const MAX_WINDOW_DAYS = 800;

export interface ClosedRangesOptions {
  /**
   * Whether days without any opening hours (e.g. weekends) are compressed
   * as a whole. When false those days keep their full width. Default: true.
   */
  compressFullyClosedDays?: boolean;
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function toMs(value: number | Date | string): number {
  return typeof value === 'number' ? value : new Date(value).getTime();
}

function dailyRangesToAbsolute(
  dayStart: number,
  dayEnd: number,
  ranges: DailyTimeRange[]
): CompressedRange[] {
  const result: CompressedRange[] = [];
  for (const range of ranges) {
    const start = dayStart + parseHHMM(range.start) * MS_PER_MINUTE;
    const end = dayStart + parseHHMM(range.end) * MS_PER_MINUTE;
    if (end > start) {
      result.push({ start: Math.max(start, dayStart), end: Math.min(end, dayEnd) });
    }
  }
  return result;
}

/**
 * Merge overlapping and touching ranges into a sorted, disjoint list.
 */
export function mergeRanges(ranges: CompressedRange[]): CompressedRange[] {
  const sorted = ranges
    .filter(r => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: CompressedRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ start: range.start, end: range.end });
    }
  }
  return merged;
}

/**
 * Opening hours that apply to the local day starting at `dayStart`,
 * as absolute timestamps. Returns a sorted, disjoint list.
 *
 * An empty result means the day is closed all day. A single range covering the
 * whole day means the config places no restriction on that day.
 */
export function openRangesForDay(
  dayStart: number,
  config: AvailabilityConfig
): CompressedRange[] {
  const start = new Date(dayStart);
  const dayEnd = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1
  ).getTime();

  const hasPattern = Boolean(config.weekly || config.simple);

  // Without a recurring pattern every moment counts as available (mirrors
  // `isAvailable`), so the whole day is open.
  if (!hasPattern) {
    return [{ start: dayStart, end: dayEnd }];
  }

  const ranges: CompressedRange[] = [];
  const dayOfWeek = start.getDay();

  if (config.weekly) {
    ranges.push(...dailyRangesToAbsolute(dayStart, dayEnd, config.weekly[dayOfWeek] ?? []));
  } else if (config.simple) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const pattern = isWeekend ? config.simple.weekends : config.simple.weekdays;
    ranges.push(...dailyRangesToAbsolute(dayStart, dayEnd, pattern ?? []));
  }

  // Specific ranges add availability on top of the pattern
  if (config.specific?.length) {
    for (const range of config.specific) {
      const specificStart = toMs(range.start as number | Date | string);
      const specificEnd = toMs(range.end as number | Date | string);
      if (specificEnd > dayStart && specificStart < dayEnd) {
        ranges.push({
          start: Math.max(specificStart, dayStart),
          end: Math.min(specificEnd, dayEnd),
        });
      }
    }
  }

  return mergeRanges(ranges);
}

/**
 * Closed periods inside `[windowStart, windowEnd]`, merged across midnight so
 * that an evening and the following morning form a single range.
 */
export function closedRangesInWindow(
  windowStart: number,
  windowEnd: number,
  config: AvailabilityConfig,
  options: ClosedRangesOptions = {}
): CompressedRange[] {
  if (windowEnd <= windowStart) return [];

  const compressFullyClosedDays = options.compressFullyClosedDays !== false;
  const closed: CompressedRange[] = [];

  const first = new Date(windowStart);
  const cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate());

  for (let day = 0; cursor.getTime() < windowEnd; day++) {
    if (day > MAX_WINDOW_DAYS) break;

    const dayStart = cursor.getTime();
    const dayEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1
    ).getTime();

    const open = openRangesForDay(dayStart, config);

    if (open.length === 0) {
      if (compressFullyClosedDays) {
        closed.push({ start: dayStart, end: dayEnd });
      }
    } else {
      // Complement of the opening hours within this day
      let position = dayStart;
      for (const range of open) {
        if (range.start > position) {
          closed.push({ start: position, end: range.start });
        }
        position = Math.max(position, range.end);
      }
      if (position < dayEnd) {
        closed.push({ start: position, end: dayEnd });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // Merge across day boundaries, then clip to the requested window
  return mergeRanges(closed)
    .map(range => ({
      start: Math.max(range.start, windowStart),
      end: Math.min(range.end, windowEnd),
    }))
    .filter(range => range.end > range.start);
}
