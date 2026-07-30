import { describe, it, expect } from 'vitest';
import { openRangesForDay, closedRangesInWindow, mergeRanges } from './closedRanges';
import type { AvailabilityConfig } from '../react/types';

const HOUR = 60 * 60 * 1000;

/** Monday 2026-07-27 local midnight */
const monday = new Date(2026, 6, 27).getTime();
/** Saturday 2026-08-01 local midnight */
const saturday = new Date(2026, 7, 1).getTime();

const shopHours: AvailabilityConfig = {
  weekly: {
    1: [{ start: '06:00', end: '18:00' }],
    2: [{ start: '06:00', end: '18:00' }],
    3: [{ start: '06:00', end: '18:00' }],
    4: [{ start: '06:00', end: '18:00' }],
    5: [{ start: '06:00', end: '18:00' }],
  },
};

describe('mergeRanges', () => {
  it('merges overlapping and touching ranges', () => {
    expect(
      mergeRanges([
        { start: 30, end: 40 },
        { start: 0, end: 10 },
        { start: 10, end: 20 },
        { start: 15, end: 25 },
      ])
    ).toEqual([
      { start: 0, end: 25 },
      { start: 30, end: 40 },
    ]);
  });

  it('drops empty ranges', () => {
    expect(mergeRanges([{ start: 5, end: 5 }, { start: 9, end: 8 }])).toEqual([]);
  });
});

describe('openRangesForDay', () => {
  it('returns the weekly pattern for that weekday', () => {
    expect(openRangesForDay(monday, shopHours)).toEqual([
      { start: monday + 6 * HOUR, end: monday + 18 * HOUR },
    ]);
  });

  it('returns nothing for a day without opening hours', () => {
    expect(openRangesForDay(saturday, shopHours)).toEqual([]);
  });

  it('treats a config without weekly/simple as always open', () => {
    const dayEnd = new Date(2026, 6, 28).getTime();
    expect(openRangesForDay(monday, { specific: [] })).toEqual([
      { start: monday, end: dayEnd },
    ]);
  });

  it('uses the simple pattern when weekly is absent', () => {
    const config: AvailabilityConfig = {
      simple: {
        weekdays: [{ start: '08:00', end: '16:00' }],
        weekends: [{ start: '10:00', end: '14:00' }],
      },
    };

    expect(openRangesForDay(monday, config)).toEqual([
      { start: monday + 8 * HOUR, end: monday + 16 * HOUR },
    ]);
    expect(openRangesForDay(saturday, config)).toEqual([
      { start: saturday + 10 * HOUR, end: saturday + 14 * HOUR },
    ]);
  });

  it('adds specific ranges on top of the weekly pattern', () => {
    const config: AvailabilityConfig = {
      ...shopHours,
      specific: [{ start: saturday + 9 * HOUR, end: saturday + 12 * HOUR }],
    };

    expect(openRangesForDay(saturday, config)).toEqual([
      { start: saturday + 9 * HOUR, end: saturday + 12 * HOUR },
    ]);
  });

  it('merges a specific range that extends the weekly pattern', () => {
    const config: AvailabilityConfig = {
      ...shopHours,
      specific: [{ start: monday + 17 * HOUR, end: monday + 20 * HOUR }],
    };

    expect(openRangesForDay(monday, config)).toEqual([
      { start: monday + 6 * HOUR, end: monday + 20 * HOUR },
    ]);
  });
});

describe('closedRangesInWindow', () => {
  it('merges the evening and the following morning into one range', () => {
    const windowEnd = monday + 2 * 24 * HOUR;
    const ranges = closedRangesInWindow(monday, windowEnd, shopHours);

    expect(ranges).toEqual([
      { start: monday, end: monday + 6 * HOUR },
      { start: monday + 18 * HOUR, end: monday + 30 * HOUR },
      { start: monday + 42 * HOUR, end: windowEnd },
    ]);
  });

  it('clips ranges to the requested window', () => {
    const windowStart = monday + 10 * HOUR;
    const windowEnd = monday + 20 * HOUR;

    expect(closedRangesInWindow(windowStart, windowEnd, shopHours)).toEqual([
      { start: monday + 18 * HOUR, end: windowEnd },
    ]);
  });

  it('compresses fully closed days by default', () => {
    // Friday 18:00 -> Monday 06:00 is one continuous closed block
    const friday = new Date(2026, 6, 31).getTime();
    const nextMonday = new Date(2026, 7, 3).getTime();
    const ranges = closedRangesInWindow(friday + 18 * HOUR, nextMonday + 12 * HOUR, shopHours);

    expect(ranges).toEqual([
      { start: friday + 18 * HOUR, end: nextMonday + 6 * HOUR },
    ]);
  });

  it('leaves fully closed days alone when asked', () => {
    const friday = new Date(2026, 6, 31).getTime();
    const nextMonday = new Date(2026, 7, 3).getTime();
    const ranges = closedRangesInWindow(friday + 18 * HOUR, nextMonday + 12 * HOUR, shopHours, {
      compressFullyClosedDays: false,
    });

    expect(ranges).toEqual([
      { start: friday + 18 * HOUR, end: saturday },
      { start: nextMonday, end: nextMonday + 6 * HOUR },
    ]);
  });

  it('returns nothing for an empty or inverted window', () => {
    expect(closedRangesInWindow(monday, monday, shopHours)).toEqual([]);
    expect(closedRangesInWindow(monday + HOUR, monday, shopHours)).toEqual([]);
  });

  it('returns nothing when the config has no recurring pattern', () => {
    expect(closedRangesInWindow(monday, monday + 24 * HOUR, {})).toEqual([]);
  });
});
