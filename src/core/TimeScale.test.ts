import { describe, it, expect } from 'vitest';
import { createTimeScale, identityTimeScale, virtualMidpoint } from './TimeScale';

const HOUR = 60 * 60 * 1000;

describe('identityTimeScale', () => {
  it('maps time to itself', () => {
    expect(identityTimeScale.isIdentity).toBe(true);
    expect(identityTimeScale.toVirtual(1234)).toBe(1234);
    expect(identityTimeScale.toReal(1234)).toBe(1234);
    expect(identityTimeScale.virtualSpan(100, 400)).toBe(300);
    expect(identityTimeScale.advance(100, 300)).toBe(400);
    expect(identityTimeScale.rangeAt(1234)).toBeNull();
  });
});

describe('createTimeScale', () => {
  it('returns the identity scale when there is nothing to compress', () => {
    expect(createTimeScale([], 0.2)).toBe(identityTimeScale);
    expect(createTimeScale([{ start: 0, end: 10 }], 1)).toBe(identityTimeScale);
  });
});

describe('compressed time scale', () => {
  // Closed 00:00-06:00 and 18:00-24:00, drawn at 25% width
  const factor = 0.25;
  const scale = createTimeScale(
    [
      { start: 0, end: 6 * HOUR },
      { start: 18 * HOUR, end: 24 * HOUR },
    ],
    factor
  );

  it('runs at normal speed outside compressed ranges', () => {
    // 06:00 sits after 6h of closed time drawn as 1.5h
    expect(scale.toVirtual(6 * HOUR)).toBe(1.5 * HOUR);
    expect(scale.virtualSpan(6 * HOUR, 18 * HOUR)).toBe(12 * HOUR);
  });

  it('runs at `factor` speed inside compressed ranges', () => {
    expect(scale.toVirtual(0)).toBe(0);
    expect(scale.toVirtual(3 * HOUR)).toBe(0.75 * HOUR);
    expect(scale.virtualSpan(18 * HOUR, 24 * HOUR)).toBe(1.5 * HOUR);
  });

  it('accumulates savings across ranges', () => {
    // Whole day: 12h open + 12h closed * 0.25
    expect(scale.virtualSpan(0, 24 * HOUR)).toBe(15 * HOUR);
    // The next day is untouched by the ranges, so it stays 24h wide
    expect(scale.virtualSpan(24 * HOUR, 48 * HOUR)).toBe(24 * HOUR);
  });

  it('is strictly monotonic', () => {
    let previous = -Infinity;
    for (let t = -2 * HOUR; t <= 26 * HOUR; t += HOUR / 4) {
      const virtual = scale.toVirtual(t);
      expect(virtual).toBeGreaterThan(previous);
      previous = virtual;
    }
  });

  it('round-trips real -> virtual -> real', () => {
    for (const t of [-HOUR, 0, 2 * HOUR, 6 * HOUR, 13 * HOUR, 18 * HOUR, 21 * HOUR, 30 * HOUR]) {
      expect(scale.toReal(scale.toVirtual(t))).toBeCloseTo(t, 6);
    }
  });

  it('advances by virtual distance', () => {
    // Half of the compressed night is 0.75h of virtual time
    expect(scale.advance(0, 0.75 * HOUR)).toBe(3 * HOUR);
    // Advancing past the night continues at normal speed
    expect(scale.advance(0, 1.5 * HOUR + 2 * HOUR)).toBe(8 * HOUR);
    expect(scale.advance(8 * HOUR, -2 * HOUR)).toBe(6 * HOUR);
  });

  it('reports the range a timestamp falls in', () => {
    expect(scale.rangeAt(0)).toEqual({ start: 0, end: 6 * HOUR });
    expect(scale.rangeAt(3 * HOUR)).toEqual({ start: 0, end: 6 * HOUR });
    // Ranges are half-open, so the end belongs to the open period
    expect(scale.rangeAt(6 * HOUR)).toBeNull();
    expect(scale.rangeAt(12 * HOUR)).toBeNull();
    expect(scale.rangeAt(20 * HOUR)).toEqual({ start: 18 * HOUR, end: 24 * HOUR });
    expect(scale.rangeAt(24 * HOUR)).toBeNull();
  });

  it('merges overlapping ranges it is given', () => {
    const overlapping = createTimeScale(
      [
        { start: 0, end: 4 * HOUR },
        { start: 2 * HOUR, end: 6 * HOUR },
      ],
      0.5
    );

    expect(overlapping.rangeAt(5 * HOUR)).toEqual({ start: 0, end: 6 * HOUR });
    expect(overlapping.virtualSpan(0, 6 * HOUR)).toBe(3 * HOUR);
  });

  it('supports collapsing ranges completely', () => {
    const collapsed = createTimeScale([{ start: 0, end: 6 * HOUR }], 0);

    expect(collapsed.virtualSpan(0, 6 * HOUR)).toBe(0);
    expect(collapsed.virtualSpan(0, 8 * HOUR)).toBe(2 * HOUR);
    // A collapsed block has no width, so its pixel resolves to the first
    // visible moment after it
    expect(collapsed.toReal(0)).toBe(6 * HOUR);
    expect(collapsed.toReal(HOUR)).toBe(7 * HOUR);
  });
});

describe('virtualMidpoint', () => {
  it('splits the range by drawn width, not by elapsed time', () => {
    const scale = createTimeScale([{ start: 0, end: 8 * HOUR }], 0.25);

    // Virtual span is 2h (compressed) + 2h (open) = 4h, so the midpoint sits
    // exactly at the end of the compressed block
    expect(virtualMidpoint(scale, 0, 10 * HOUR)).toBe(8 * HOUR);
    expect(virtualMidpoint(identityTimeScale, 0, 10 * HOUR)).toBe(5 * HOUR);
  });
});
