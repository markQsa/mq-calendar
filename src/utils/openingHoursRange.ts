/**
 * Derive a visible opening-hours range for a given day from an AvailabilityConfig.
 *
 * Used by DayCalendar to constrain the vertical time axis to the hours that
 * are actually in use, instead of always showing 00:00–24:00.
 *
 * The range is the union (min start, max end) of all ranges that apply to
 * the target day across `weekly`, `simple`, and `specific` sources. Missing
 * sources are ignored; if nothing applies, the full day [0, 1440] is returned.
 */

import type { AvailabilityConfig } from '../react/types';

export interface OpeningHoursRange {
  /** Minutes from midnight (inclusive) */
  startMinutes: number;
  /** Minutes from midnight (exclusive) */
  endMinutes: number;
}

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function toMs(value: number | Date | string): number {
  return typeof value === 'number' ? value : new Date(value).getTime();
}

/**
 * Return the visible time range for `date` derived from `config`.
 *
 * Falls back to the full day [0, 1440] when no ranges apply.
 */
export function openingHoursRangeForDate(
  date: Date,
  config?: AvailabilityConfig
): OpeningHoursRange {
  const fallback: OpeningHoursRange = { startMinutes: 0, endMinutes: MINUTES_PER_DAY };
  if (!config) return fallback;

  const minutes: Array<{ start: number; end: number }> = [];
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (config.weekly?.[dayOfWeek]) {
    for (const range of config.weekly[dayOfWeek]) {
      minutes.push({ start: parseHHMM(range.start), end: parseHHMM(range.end) });
    }
  }

  if (config.simple) {
    const simpleRanges = isWeekend ? config.simple.weekends : config.simple.weekdays;
    if (simpleRanges) {
      for (const range of simpleRanges) {
        minutes.push({ start: parseHHMM(range.start), end: parseHHMM(range.end) });
      }
    }
  }

  if (config.specific?.length) {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + MS_PER_DAY;
    for (const range of config.specific) {
      const startMs = toMs(range.start as number | Date | string);
      const endMs = toMs(range.end as number | Date | string);
      if (endMs > dayStart && startMs < dayEnd) {
        const clippedStart = Math.max(startMs, dayStart) - dayStart;
        const clippedEnd = Math.min(endMs, dayEnd) - dayStart;
        minutes.push({
          start: Math.floor(clippedStart / MS_PER_MINUTE),
          end: Math.ceil(clippedEnd / MS_PER_MINUTE),
        });
      }
    }
  }

  if (minutes.length === 0) return fallback;

  return {
    startMinutes: Math.max(0, Math.min(...minutes.map(r => r.start))),
    endMinutes: Math.min(MINUTES_PER_DAY, Math.max(...minutes.map(r => r.end))),
  };
}
