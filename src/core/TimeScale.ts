import type { CompressedRange } from './types';

/** Default width multiplier for compressed ranges */
export const DEFAULT_COMPRESSION_FACTOR = 0.15;

/** Compression is disabled above this viewport span (62 days) */
export const DEFAULT_COMPRESSION_MAX_VIEWPORT_SPAN = 62 * 24 * 60 * 60 * 1000;

/**
 * A monotonic mapping between real time and "virtual" time.
 *
 * Pixel positions are always computed from virtual time, so shrinking a range
 * in virtual time shrinks it on screen. Without compression the mapping is the
 * identity and the timeline behaves exactly like a linear axis.
 *
 * Example: with opening hours 06:00-18:00 and `factor = 0.15`, the closed
 * 18:00-06:00 block contributes only 12h * 0.15 = 1.8h of virtual time, so it
 * renders as a narrow strip between two full-width working days.
 */
export interface TimeScale {
  /** True when no compression is applied (real time === virtual time) */
  readonly isIdentity: boolean;
  /** Width multiplier applied inside compressed ranges (1 for identity) */
  readonly factor: number;
  /** Real timestamp -> virtual timestamp */
  toVirtual(timestamp: number): number;
  /**
   * Virtual timestamp -> real timestamp.
   * A fully collapsed range (`factor: 0`) has no width to map back into, so its
   * position resolves to the first visible moment after it.
   */
  toReal(virtual: number): number;
  /** Virtual distance between two real timestamps (signed) */
  virtualSpan(from: number, to: number): number;
  /** Real timestamp that lies `virtualDelta` virtual ms from `timestamp` */
  advance(timestamp: number, virtualDelta: number): number;
  /** The compressed range containing `timestamp`, or null */
  rangeAt(timestamp: number): CompressedRange | null;
}

class IdentityTimeScale implements TimeScale {
  readonly isIdentity = true;
  readonly factor = 1;

  toVirtual(timestamp: number): number {
    return timestamp;
  }

  toReal(virtual: number): number {
    return virtual;
  }

  virtualSpan(from: number, to: number): number {
    return to - from;
  }

  advance(timestamp: number, virtualDelta: number): number {
    return timestamp + virtualDelta;
  }

  rangeAt(): CompressedRange | null {
    return null;
  }
}

/** Shared identity scale — the default for every timeline */
export const identityTimeScale: TimeScale = new IdentityTimeScale();

interface CompressedSegment {
  realStart: number;
  realEnd: number;
  virtualStart: number;
  virtualEnd: number;
}

/**
 * Piecewise-linear scale: time inside the given ranges runs at `factor` speed,
 * everything else at normal speed.
 */
class PiecewiseTimeScale implements TimeScale {
  readonly isIdentity = false;
  readonly factor: number;
  private segments: CompressedSegment[];

  constructor(ranges: CompressedRange[], factor: number) {
    this.factor = Math.max(0, Math.min(1, factor));

    // Normalize into a sorted, disjoint list so lookups can binary search
    const normalized: CompressedRange[] = [];
    for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
      if (range.end <= range.start) continue;
      const last = normalized[normalized.length - 1];
      if (last && range.start <= last.end) {
        last.end = Math.max(last.end, range.end);
      } else {
        normalized.push({ start: range.start, end: range.end });
      }
    }

    let savings = 0;
    this.segments = normalized.map(range => {
      const virtualStart = range.start - savings;
      const virtualEnd = virtualStart + (range.end - range.start) * this.factor;
      savings += range.end - range.start - (virtualEnd - virtualStart);
      return {
        realStart: range.start,
        realEnd: range.end,
        virtualStart,
        virtualEnd,
      };
    });
  }

  /** Index of the last segment starting at or before `timestamp` (-1 if none) */
  private indexAtReal(timestamp: number): number {
    let low = 0;
    let high = this.segments.length - 1;
    let found = -1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.segments[mid].realStart <= timestamp) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return found;
  }

  /** Index of the last segment starting at or before `virtual` (-1 if none) */
  private indexAtVirtual(virtual: number): number {
    let low = 0;
    let high = this.segments.length - 1;
    let found = -1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.segments[mid].virtualStart <= virtual) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return found;
  }

  toVirtual(timestamp: number): number {
    const index = this.indexAtReal(timestamp);
    if (index < 0) return timestamp;

    const segment = this.segments[index];
    if (timestamp >= segment.realEnd) {
      // Past the segment: subtract all savings accumulated up to its end
      return timestamp - (segment.realEnd - segment.virtualEnd);
    }

    return segment.virtualStart + (timestamp - segment.realStart) * this.factor;
  }

  toReal(virtual: number): number {
    const index = this.indexAtVirtual(virtual);
    if (index < 0) return virtual;

    const segment = this.segments[index];
    if (virtual >= segment.virtualEnd) {
      return virtual + (segment.realEnd - segment.virtualEnd);
    }

    // Fully collapsed segments have no interior to map back into
    if (this.factor === 0) return segment.realStart;

    return segment.realStart + (virtual - segment.virtualStart) / this.factor;
  }

  virtualSpan(from: number, to: number): number {
    return this.toVirtual(to) - this.toVirtual(from);
  }

  advance(timestamp: number, virtualDelta: number): number {
    return this.toReal(this.toVirtual(timestamp) + virtualDelta);
  }

  rangeAt(timestamp: number): CompressedRange | null {
    const index = this.indexAtReal(timestamp);
    if (index < 0) return null;

    const segment = this.segments[index];
    if (timestamp >= segment.realEnd) return null;

    return { start: segment.realStart, end: segment.realEnd };
  }
}

/**
 * Create a scale that compresses `ranges` by `factor`.
 * Returns the identity scale when there is nothing to compress.
 */
export function createTimeScale(ranges: CompressedRange[], factor: number): TimeScale {
  if (ranges.length === 0 || factor >= 1) return identityTimeScale;
  return new PiecewiseTimeScale(ranges, factor);
}

/**
 * Real timestamp halfway between `from` and `to` in virtual time
 */
export function virtualMidpoint(scale: TimeScale, from: number, to: number): number {
  return scale.toReal((scale.toVirtual(from) + scale.toVirtual(to)) / 2);
}
