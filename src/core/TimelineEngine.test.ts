import { describe, it, expect, beforeEach } from 'vitest';
import { TimelineEngine } from './TimelineEngine';

describe('TimelineEngine', () => {
  let engine: TimelineEngine;
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  const viewportWidth = 1000;

  beforeEach(() => {
    engine = new TimelineEngine({
      viewportStart: startDate,
      viewportEnd: endDate,
      containerWidth: viewportWidth
    });
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(engine).toBeDefined();
    });

    it('should return viewport state', () => {
      const state = engine.getViewportState();
      expect(state).toBeDefined();
      expect(state.start).toBeTypeOf('number');
      expect(state.end).toBeTypeOf('number');
      expect(state.end).toBeGreaterThan(state.start);
    });

    it('should return zoom state', () => {
      const zoomState = engine.getZoomState();
      expect(zoomState).toBeDefined();
      expect(zoomState.pixelsPerMs).toBeGreaterThan(0);
    });
  });

  describe('time to pixel conversion', () => {
    it('should convert time to pixel position', () => {
      const timestamp = new Date('2025-06-15').getTime();
      const pixel = engine.timeToPixel(timestamp);

      expect(pixel).toBeTypeOf('number');
      expect(isFinite(pixel)).toBe(true);
    });

    it('should return 0 for viewport start time', () => {
      const viewport = engine.getViewportState();
      const pixel = engine.timeToPixel(viewport.start);
      expect(pixel).toBe(0);
    });
  });

  describe('pixel to time conversion', () => {
    it('should convert pixel to timestamp', () => {
      const pixel = 500;
      const timestamp = engine.pixelToTime(pixel);

      expect(timestamp).toBeTypeOf('number');
      expect(isFinite(timestamp)).toBe(true);
    });

    it('should be reversible with timeToPixel', () => {
      const originalTime = new Date('2025-06-15').getTime();
      const pixel = engine.timeToPixel(originalTime);
      const convertedTime = engine.pixelToTime(pixel);

      // Should be approximately equal
      expect(Math.abs(convertedTime - originalTime)).toBeLessThan(1);
    });
  });

  describe('duration conversion', () => {
    it('should convert duration to pixels', () => {
      const oneDay = 24 * 60 * 60 * 1000; // 1 day in ms
      const pixels = engine.durationToPixels(oneDay);

      expect(pixels).toBeGreaterThan(0);
      expect(isFinite(pixels)).toBe(true);
    });

    it('should handle zero duration', () => {
      const pixels = engine.durationToPixels(0);
      expect(pixels).toBe(0);
    });
  });

  describe('zooming', () => {
    it('should zoom in (increase pixels per ms)', () => {
      const initialZoom = engine.getZoomState().pixelsPerMs;

      engine.zoom(2, 500); // 2x zoom at pixel 500

      const newZoom = engine.getZoomState().pixelsPerMs;
      expect(newZoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out (decrease pixels per ms)', () => {
      const initialZoom = engine.getZoomState().pixelsPerMs;

      engine.zoom(0.5, 500); // 0.5x zoom at pixel 500

      const newZoom = engine.getZoomState().pixelsPerMs;
      expect(newZoom).toBeLessThan(initialZoom);
    });
  });

  describe('scrolling', () => {
    it('should scroll the viewport', () => {
      const initialViewport = engine.getViewportState();

      engine.scroll(100);

      const newViewport = engine.getViewportState();
      expect(newViewport.start).not.toBe(initialViewport.start);
    });

    it('should maintain viewport span when scrolling', () => {
      const initialViewport = engine.getViewportState();
      const initialSpan = initialViewport.end - initialViewport.start;

      engine.scroll(200);

      const newViewport = engine.getViewportState();
      const newSpan = newViewport.end - newViewport.start;

      expect(newSpan).toBe(initialSpan);
    });
  });

  describe('viewport state', () => {
    it('should return correct viewport bounds', () => {
      const state = engine.getViewportState();

      expect(state.start).toBeDefined();
      expect(state.end).toBeDefined();
      expect(state.end).toBeGreaterThan(state.start);
    });

    it('should update viewport width', () => {
      engine.updateContainerWidth(2000);

      // Viewport should still be valid
      const state = engine.getViewportState();
      expect(state.start).toBeDefined();
      expect(state.end).toBeGreaterThan(state.start);
    });
  });
});
