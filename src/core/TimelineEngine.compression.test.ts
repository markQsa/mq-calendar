import { describe, it, expect } from 'vitest';
import { TimelineEngine } from './TimelineEngine';
import { closedRangesInWindow } from '../utils/closedRanges';
import type { TimeCompressionConfig } from './types';
import type { AvailabilityConfig } from '../react/types';

const HOUR = 60 * 60 * 1000;
const CONTAINER_WIDTH = 1000;

/** Monday 2026-07-27, a car workshop open 06:00-18:00 on weekdays */
const dayStart = new Date(2026, 6, 27);
const dayEnd = new Date(2026, 6, 28);

const workshopHours: AvailabilityConfig = {
  weekly: {
    1: [{ start: '06:00', end: '18:00' }],
    2: [{ start: '06:00', end: '18:00' }],
    3: [{ start: '06:00', end: '18:00' }],
    4: [{ start: '06:00', end: '18:00' }],
    5: [{ start: '06:00', end: '18:00' }],
  },
};

function compression(overrides: Partial<TimeCompressionConfig> = {}): TimeCompressionConfig {
  return {
    factor: 0.25,
    getRanges: (windowStart, windowEnd) =>
      closedRangesInWindow(windowStart, windowEnd, workshopHours),
    ...overrides,
  };
}

function createEngine(config?: TimeCompressionConfig, start = dayStart, end = dayEnd) {
  return new TimelineEngine({
    viewportStart: start,
    viewportEnd: end,
    containerWidth: CONTAINER_WIDTH,
    compression: config,
  });
}

describe('TimelineEngine with compressed closed hours', () => {
  const open = dayStart.getTime() + 6 * HOUR;
  const close = dayStart.getTime() + 18 * HOUR;

  it('still fits the requested range in the container', () => {
    const engine = createEngine(compression());
    const viewport = engine.getViewportState();

    expect(viewport.start).toBeCloseTo(dayStart.getTime(), -1);
    expect(viewport.end).toBeCloseTo(dayEnd.getTime(), -1);
    expect(engine.rangeToPixels(viewport.start, viewport.end)).toBeCloseTo(CONTAINER_WIDTH, 6);
  });

  it('gives opening hours most of the width', () => {
    const engine = createEngine(compression());

    // Virtual day = 12h open + 12h closed * 0.25 = 15h
    const openWidth = engine.rangeToPixels(open, close);
    expect(openWidth).toBeCloseTo((12 / 15) * CONTAINER_WIDTH, 3);

    // 00:00-06:00 and 18:00-24:00 each shrink to 1.5h of the 15h axis
    expect(engine.timeToPixel(open)).toBeCloseTo((1.5 / 15) * CONTAINER_WIDTH, 3);
    expect(engine.rangeToPixels(close, dayEnd.getTime())).toBeCloseTo(
      (1.5 / 15) * CONTAINER_WIDTH,
      3
    );
  });

  it('keeps positions linear inside opening hours', () => {
    const engine = createEngine(compression());
    const noon = dayStart.getTime() + 12 * HOUR;

    const hourWidth = engine.rangeToPixels(open, open + HOUR);
    expect(engine.timeToPixel(noon) - engine.timeToPixel(open)).toBeCloseTo(hourWidth * 6, 3);
  });

  it('is a no-op without a compression config', () => {
    const engine = createEngine();

    expect(engine.getTimeScale().isIdentity).toBe(true);
    expect(engine.rangeToPixels(open, close)).toBeCloseTo(CONTAINER_WIDTH / 2, 3);
  });

  it('round-trips pixels back to time across compressed ranges', () => {
    const engine = createEngine(compression());

    for (const timestamp of [dayStart.getTime(), open, open + 3 * HOUR, close, close + HOUR]) {
      const pixel = engine.timeToPixel(timestamp);
      expect(engine.pixelToTime(pixel)).toBeCloseTo(timestamp, -1);
    }
  });

  it('skips compression for viewports wider than maxViewportSpan', () => {
    const engine = createEngine(
      compression({ maxViewportSpan: 2 * 24 * HOUR }),
      new Date(2026, 6, 1),
      new Date(2026, 6, 31)
    );

    expect(engine.getTimeScale().isIdentity).toBe(true);

    // Positions stay linear across what would otherwise be closed hours
    const pixelsPerMs = engine.getZoomState().pixelsPerMs;
    const monthStart = new Date(2026, 6, 1).getTime();
    const monthEnd = new Date(2026, 6, 31).getTime();
    expect(engine.rangeToPixels(monthStart, monthEnd)).toBeCloseTo(
      (monthEnd - monthStart) * pixelsPerMs,
      3
    );
  });

  it('keeps the visible range when compression is turned on and off', () => {
    const engine = createEngine();
    const before = engine.getViewportState();

    engine.setCompression(compression());
    const compressed = engine.getViewportState();

    expect(compressed.start).toBeCloseTo(before.start, -1);
    expect(compressed.end).toBeCloseTo(before.end, -1);
    expect(engine.getTimeScale().isIdentity).toBe(false);
    expect(engine.rangeToPixels(compressed.start, compressed.end)).toBeCloseTo(CONTAINER_WIDTH, 6);

    engine.setCompression(null);
    const after = engine.getViewportState();

    expect(engine.getTimeScale().isIdentity).toBe(true);
    expect(after.start).toBeCloseTo(before.start, -1);
    expect(engine.rangeToPixels(after.start, after.end)).toBeCloseTo(CONTAINER_WIDTH, 6);
  });

  it('scrolls by pixels, not by raw milliseconds', () => {
    const engine = createEngine(compression());
    const before = engine.getViewportState();

    engine.scroll(100);
    const after = engine.getViewportState();

    // The viewport still covers exactly one container width...
    expect(engine.rangeToPixels(after.start, after.end)).toBeCloseTo(CONTAINER_WIDTH, 6);
    // ...and the old start moved left by exactly 100px
    expect(engine.timeToPixel(before.start)).toBeCloseTo(-100, 6);
  });

  it('zooms around the focal pixel', () => {
    const engine = createEngine(compression());
    const focalTime = engine.pixelToTime(400);

    engine.zoom(2, 400);

    expect(engine.timeToPixel(focalTime)).toBeCloseTo(400, 3);
    expect(engine.getZoomState().pixelsPerMs).toBeGreaterThan(0);
  });

  it('merges header cells that are too narrow inside a compressed range', () => {
    const engine = createEngine(compression());
    const rows = engine.getHeaderCells();
    const hourRow = rows.find(row => row[0]?.type === 'hour');

    expect(hourRow).toBeDefined();

    const compressedCells = hourRow!.filter(cell => cell.isCompressed);
    expect(compressedCells.length).toBeGreaterThan(0);

    // The six night hours collapse into a single labelled cell per strip
    for (const cell of compressedCells) {
      expect(cell.mergedCellCount).toBeGreaterThan(1);
    }

    // Cells still tile the axis without gaps or overlaps
    const sorted = [...hourRow!].sort((a, b) => a.position - b.position);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].position).toBeCloseTo(sorted[i - 1].position + sorted[i - 1].width, 3);
    }
  });

  it('blanks labels that cannot fit in a compressed cell', () => {
    // At 5% the strips are ~29px - too narrow for even a two-digit hour label
    const engine = createEngine(compression({ factor: 0.05 }));
    const hourRow = engine.getHeaderCells().find(row => row[0]?.type === 'hour');

    expect(hourRow).toBeDefined();

    const compressedCells = hourRow!.filter(cell => cell.isCompressed);
    expect(compressedCells.length).toBeGreaterThan(0);
    expect(compressedCells.every(cell => cell.label === '')).toBe(true);

    // Labels inside opening hours are untouched
    expect(hourRow!.filter(cell => !cell.isCompressed).every(cell => cell.label !== '')).toBe(true);
  });

  it('drops grid lines that would be unreadably dense inside a compressed range', () => {
    const engine = createEngine(compression({ factor: 0.05 }));
    const insideStrip = engine
      .getVisibleGridLines()
      .filter(line => line.type === 'hour' && line.isCompressed);

    // Only the boundary line where the closed period starts survives
    for (const line of insideStrip) {
      const range = engine.getTimeScale().rangeAt(line.timestamp);
      expect(line.timestamp).toBe(range?.start);
    }
  });
});
