import type { ZoomState, ViewportState } from './types';

/**
 * Handles conversion between time (timestamps) and pixel positions
 */
export class TimeConverter {
  private zoomState: ZoomState;
  private viewport: ViewportState;

  constructor(zoomState: ZoomState, viewport: ViewportState) {
    this.zoomState = zoomState;
    this.viewport = viewport;
  }

  /**
   * Convert a timestamp to pixel position relative to viewport start
   */
  timeToPixel(timestamp: number): number {
    const deltaTime = timestamp - this.viewport.start;
    return deltaTime * this.zoomState.pixelsPerMs;
  }

  /**
   * Convert pixel position (relative to viewport start) to timestamp
   */
  pixelToTime(pixel: number): number {
    const deltaTime = pixel / this.zoomState.pixelsPerMs;
    return this.viewport.start + deltaTime;
  }

  /**
   * Convert duration in milliseconds to pixel width
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
