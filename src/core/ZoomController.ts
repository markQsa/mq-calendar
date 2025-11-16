import type { ZoomState, ViewportState, ZoomResult } from './types';

export interface ZoomControllerConfig {
  /** Minimum zoom level (pixels per millisecond) */
  minZoom: number;
  /** Maximum zoom level (pixels per millisecond) */
  maxZoom: number;
  /** Container width in pixels */
  containerWidth: number;
}

/**
 * Handles smooth, continuous zoom operations
 */
export class ZoomController {
  private config: ZoomControllerConfig;

  constructor(config: ZoomControllerConfig) {
    this.config = config;
  }

  /**
   * Apply smooth zoom transformation
   * @param currentZoom - Current zoom state
   * @param currentViewport - Current viewport state
   * @param zoomDelta - Zoom factor (e.g., 1.1 for 10% zoom in, 0.9 for zoom out)
   * @param focalPointX - X position in pixels where zoom is centered (relative to viewport)
   * @returns New zoom and viewport states
   */
  applyZoom(
    currentZoom: ZoomState,
    currentViewport: ViewportState,
    zoomDelta: number,
    focalPointX: number
  ): ZoomResult {
    // Calculate new zoom level
    const newPixelsPerMs = currentZoom.pixelsPerMs * zoomDelta;

    // Clamp to min/max zoom levels
    const clampedPixelsPerMs = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, newPixelsPerMs)
    );

    // If zoom didn't actually change (hit limits), return current state
    if (clampedPixelsPerMs === currentZoom.pixelsPerMs) {
      return {
        zoomState: currentZoom,
        viewport: currentViewport
      };
    }

    // Calculate the timestamp at the focal point BEFORE zoom
    const focalTimestamp = currentViewport.start + (focalPointX / currentZoom.pixelsPerMs);

    // After zoom, we want the focal point timestamp to remain at the same pixel position
    // So we calculate the new viewport start
    const newViewportStart = focalTimestamp - (focalPointX / clampedPixelsPerMs);

    // Calculate viewport end based on container width and new zoom
    const viewportDuration = this.config.containerWidth / clampedPixelsPerMs;
    const newViewportEnd = newViewportStart + viewportDuration;

    return {
      zoomState: {
        pixelsPerMs: clampedPixelsPerMs,
        centerTimestamp: focalTimestamp
      },
      viewport: {
        start: newViewportStart,
        end: newViewportEnd,
        scrollOffset: currentViewport.scrollOffset
      }
    };
  }

  /**
   * Zoom in by a standard increment
   */
  zoomIn(
    currentZoom: ZoomState,
    currentViewport: ViewportState,
    focalPointX?: number
  ): ZoomResult {
    // Default focal point is center of viewport
    const focal = focalPointX ?? this.config.containerWidth / 2;
    return this.applyZoom(currentZoom, currentViewport, 1.2, focal);
  }

  /**
   * Zoom out by a standard increment
   */
  zoomOut(
    currentZoom: ZoomState,
    currentViewport: ViewportState,
    focalPointX?: number
  ): ZoomResult {
    const focal = focalPointX ?? this.config.containerWidth / 2;
    return this.applyZoom(currentZoom, currentViewport, 1 / 1.2, focal);
  }

  /**
   * Zoom to fit a specific time range in the viewport
   */
  zoomToFit(startTime: number, endTime: number): ZoomResult {
    const duration = endTime - startTime;
    const pixelsPerMs = this.config.containerWidth / duration;

    // Clamp to limits
    const clampedPixelsPerMs = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, pixelsPerMs)
    );

    // Recalculate duration if zoom was clamped
    const actualDuration = this.config.containerWidth / clampedPixelsPerMs;
    const center = (startTime + endTime) / 2;

    return {
      zoomState: {
        pixelsPerMs: clampedPixelsPerMs,
        centerTimestamp: center
      },
      viewport: {
        start: center - actualDuration / 2,
        end: center + actualDuration / 2,
        scrollOffset: 0
      }
    };
  }

  /**
   * Update container width (e.g., on window resize)
   */
  updateContainerWidth(
    newWidth: number,
    currentZoom: ZoomState,
    currentViewport: ViewportState
  ): ZoomResult {
    this.config.containerWidth = newWidth;

    // Maintain the center timestamp
    const center = (currentViewport.start + currentViewport.end) / 2;
    const newDuration = newWidth / currentZoom.pixelsPerMs;

    return {
      zoomState: currentZoom,
      viewport: {
        start: center - newDuration / 2,
        end: center + newDuration / 2,
        scrollOffset: currentViewport.scrollOffset
      }
    };
  }

  /**
   * Update zoom limits
   */
  updateLimits(minZoom: number, maxZoom: number): void {
    this.config.minZoom = minZoom;
    this.config.maxZoom = maxZoom;
  }

  /**
   * Get current configuration
   */
  getConfig(): ZoomControllerConfig {
    return { ...this.config };
  }
}
