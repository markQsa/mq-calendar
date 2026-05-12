import { describe, it, expect } from 'vitest';
import { openingHoursRangeForDate } from './openingHoursRange';

describe('openingHoursRangeForDate', () => {
  it('falls back to full day when no config is provided', () => {
    const date = new Date(2026, 4, 11); // Mon May 11 2026
    expect(openingHoursRangeForDate(date)).toEqual({
      startMinutes: 0,
      endMinutes: 24 * 60,
    });
  });

  it('uses weekly pattern for the target weekday', () => {
    const monday = new Date(2026, 4, 11); // Monday
    const result = openingHoursRangeForDate(monday, {
      weekly: {
        1: [{ start: '08:00', end: '17:30' }],
      },
    });
    expect(result).toEqual({ startMinutes: 8 * 60, endMinutes: 17 * 60 + 30 });
  });

  it('takes union of multiple weekly ranges (min start, max end)', () => {
    const monday = new Date(2026, 4, 11);
    const result = openingHoursRangeForDate(monday, {
      weekly: {
        1: [
          { start: '08:00', end: '12:00' },
          { start: '13:00', end: '18:00' },
        ],
      },
    });
    expect(result).toEqual({ startMinutes: 8 * 60, endMinutes: 18 * 60 });
  });

  it('falls back to full day when weekly has no ranges for that weekday', () => {
    const sunday = new Date(2026, 4, 10);
    const result = openingHoursRangeForDate(sunday, {
      weekly: {
        1: [{ start: '08:00', end: '17:00' }],
      },
    });
    expect(result).toEqual({ startMinutes: 0, endMinutes: 24 * 60 });
  });

  it('uses simple weekdays pattern on a weekday', () => {
    const wednesday = new Date(2026, 4, 13);
    const result = openingHoursRangeForDate(wednesday, {
      simple: {
        weekdays: [{ start: '07:30', end: '16:00' }],
        weekends: [{ start: '10:00', end: '14:00' }],
      },
    });
    expect(result).toEqual({ startMinutes: 7 * 60 + 30, endMinutes: 16 * 60 });
  });

  it('uses simple weekends pattern on Saturday/Sunday', () => {
    const saturday = new Date(2026, 4, 9);
    const result = openingHoursRangeForDate(saturday, {
      simple: {
        weekdays: [{ start: '07:30', end: '16:00' }],
        weekends: [{ start: '10:00', end: '14:00' }],
      },
    });
    expect(result).toEqual({ startMinutes: 10 * 60, endMinutes: 14 * 60 });
  });

  it('clips specific ranges to the target day', () => {
    const date = new Date(2026, 4, 11);
    const dayStart = new Date(2026, 4, 11).getTime();
    const result = openingHoursRangeForDate(date, {
      specific: [
        {
          start: dayStart + 9 * 60 * 60 * 1000,
          end: dayStart + 15 * 60 * 60 * 1000,
        },
      ],
    });
    expect(result).toEqual({ startMinutes: 9 * 60, endMinutes: 15 * 60 });
  });

  it('combines weekly and specific into a single union', () => {
    const monday = new Date(2026, 4, 11);
    const dayStart = new Date(2026, 4, 11).getTime();
    const result = openingHoursRangeForDate(monday, {
      weekly: { 1: [{ start: '09:00', end: '17:00' }] },
      specific: [
        {
          start: dayStart + 7 * 60 * 60 * 1000,
          end: dayStart + 19 * 60 * 60 * 1000,
        },
      ],
    });
    expect(result).toEqual({ startMinutes: 7 * 60, endMinutes: 19 * 60 });
  });

  it('ignores specific ranges that fall outside the target day', () => {
    const monday = new Date(2026, 4, 11);
    const tuesdayStart = new Date(2026, 4, 12).getTime();
    const result = openingHoursRangeForDate(monday, {
      specific: [
        {
          start: tuesdayStart + 9 * 60 * 60 * 1000,
          end: tuesdayStart + 15 * 60 * 60 * 1000,
        },
      ],
    });
    expect(result).toEqual({ startMinutes: 0, endMinutes: 24 * 60 });
  });
});
