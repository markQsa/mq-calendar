import type { ZoomState, ViewportState } from './types';
import { identityTimeScale, type TimeScale } from './TimeScale';

/**
 * Handles conversion between time (timestamps) and pixel positions
 *
 * All conversions go through a {@link TimeScale}, which is the identity unless
 * the timeline compresses part of the axis (e.g. closed hours).
 */
export class TimeConverter {
  private zoomState: ZoomState;
  private viewport: ViewportState;
  private scale: TimeScale;

  constructor(zoomState: ZoomState, viewport: ViewportState, scale: TimeScale = identityTimeScale) {
    this.zoomState = zoomState;
    this.viewport = viewport;
    this.scale = scale;
  }

  /**
   * Convert a timestamp to pixel position relative to viewport start
   */
  timeToPixel(timestamp: number): number {
    return this.scale.virtualSpan(this.viewport.start, timestamp) * this.zoomState.pixelsPerMs;
  }

  /**
   * Convert pixel position (relative to viewport start) to timestamp
   */
  pixelToTime(pixel: number): number {
    return this.scale.advance(this.viewport.start, pixel / this.zoomState.pixelsPerMs);
  }

  /**
   * Convert a time range to its pixel width.
   *
   * Prefer this over {@link durationToPixels} for anything drawn on the
   * timeline: a duration alone cannot account for compressed ranges.
   */
  rangeToPixels(startTimestamp: number, endTimestamp: number): number {
    return this.scale.virtualSpan(startTimestamp, endTimestamp) * this.zoomState.pixelsPerMs;
  }

  /**
   * Convert duration in milliseconds to pixel width.
   *
   * Ignores axis compression — the result is only exact when the timeline has
   * no compressed ranges, or when the range lies entirely outside them.
   */
  durationToPixels(durationMs: number): number {
    return durationMs * this.zoomState.pixelsPerMs;
  }

  /**
   * Convert pixel width to duration in milliseconds
   */
  pixelsToDuration(pixels: number): number {
    return pixels / this.zoomState.pixelsPerMs;
  }

  /**
   * Get the visible time range in milliseconds
   */
  getVisibleDuration(): number {
    return this.viewport.end - this.viewport.start;
  }

  /**
   * Update zoom state
   */
  setZoomState(zoomState: ZoomState): void {
    this.zoomState = zoomState;
  }

  /**
   * Update viewport state
   */
  setViewport(viewport: ViewportState): void {
    this.viewport = viewport;
  }

  /**
   * Update the time scale (axis compression)
   */
  setScale(scale: TimeScale): void {
    this.scale = scale;
  }

  /**
   * Get current time scale
   */
  getScale(): TimeScale {
    return this.scale;
  }

  /**
   * Get current zoom state
   */
  getZoomState(): ZoomState {
    return { ...this.zoomState };
  }

  /**
   * Get current viewport state
   */
  getViewport(): ViewportState {
    return { ...this.viewport };
  }
}
