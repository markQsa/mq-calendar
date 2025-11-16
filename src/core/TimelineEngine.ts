import type {
  TimelineConfig,
  ZoomState,
  ViewportState,
  GridLine,
  HeaderCell,
  ZoomResult,
  ScrollResult
} from './types';
import { ZoomController, type ZoomControllerConfig } from './ZoomController';
import { ScrollController } from './ScrollController';
import { GridCalculator, type GridCalculatorConfig } from './GridCalculator';
import { TimeConverter } from './TimeConverter';
import { addTime } from '../utils/dateUtils';

/**
 * Main engine that orchestrates all timeline operations
 */
export class TimelineEngine {
  private zoomController: ZoomController;
  private scrollController: ScrollController;
  private gridCalculator: GridCalculator;
  private timeConverter: TimeConverter;

  private zoomState: ZoomState;
  private viewportState: ViewportState;
  private containerWidth: number;
  private minZoom: number;
  private maxZoom: number;
  private animationFrame: number | null = null;

  constructor(config: TimelineConfig) {
    this.containerWidth = config.containerWidth;

    // Calculate initial zoom level to fit the entire range
    const duration = config.viewportEnd.getTime() - config.viewportStart.getTime();
    const initialPixelsPerMs = config.containerWidth / duration;

    // Apply min/max zoom constraints
    this.minZoom = config.minZoom ?? 0.000001; // ~1px per second
    this.maxZoom = config.maxZoom ?? 1; // 1px per millisecond

    const clampedPixelsPerMs = Math.max(this.minZoom, Math.min(this.maxZoom, initialPixelsPerMs));

    // Initialize zoom state
    this.zoomState = {
      pixelsPerMs: clampedPixelsPerMs,
      centerTimestamp: (config.viewportStart.getTime() + config.viewportEnd.getTime()) / 2
    };

    // Initialize viewport state
    const viewportDuration = config.containerWidth / clampedPixelsPerMs;
    const center = this.zoomState.centerTimestamp;

    this.viewportState = {
      start: center - viewportDuration / 2,
      end: center + viewportDuration / 2,
      scrollOffset: 0
    };

    // Initialize controllers
    const zoomConfig: ZoomControllerConfig = {
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      containerWidth: config.containerWidth
    };

    this.zoomController = new ZoomController(zoomConfig);
    this.scrollController = new ScrollController();
    this.gridCalculator = new GridCalculator();
    this.timeConverter = new TimeConverter(this.zoomState, this.viewportState);
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
  getViewportState(): ViewportState {
    return { ...this.viewportState };
  }

  /**
   * Convert timestamp to pixel position
   */
  timeToPixel(timestamp: number): number {
    return this.timeConverter.timeToPixel(timestamp);
  }

  /**
   * Convert pixel position to timestamp
   */
  pixelToTime(pixel: number): number {
    return this.timeConverter.pixelToTime(pixel);
  }

  /**
   * Convert duration to pixels
   */
  durationToPixels(durationMs: number): number {
    return this.timeConverter.durationToPixels(durationMs);
  }

  /**
   * Apply zoom operation
   */
  zoom(zoomDelta: number, focalPointX: number): ZoomResult {
    const result = this.zoomController.applyZoom(
      this.zoomState,
      this.viewportState,
      zoomDelta,
      focalPointX
    );

    this.updateState(result);
    return result;
  }

  /**
   * Zoom in
   */
  zoomIn(focalPointX?: number): ZoomResult {
    const result = this.zoomController.zoomIn(this.zoomState, this.viewportState, focalPointX);
    this.updateState(result);
    return result;
  }

  /**
   * Zoom out
   */
  zoomOut(focalPointX?: number): ZoomResult {
    const result = this.zoomController.zoomOut(this.zoomState, this.viewportState, focalPointX);
    this.updateState(result);
    return result;
  }

  /**
   * Zoom to fit a specific time range
   */
  zoomToFit(startTime: number, endTime: number): ZoomResult {
    const result = this.zoomController.zoomToFit(startTime, endTime);
    this.updateState(result);
    return result;
  }

  /**
   * Apply scroll operation
   */
  scroll(deltaPixels: number): ScrollResult {
    const result = this.scrollController.applyScroll(
      this.zoomState,
      this.viewportState,
      deltaPixels
    );

    this.viewportState = result.viewport;
    this.timeConverter.setViewport(this.viewportState);
    return result;
  }

  /**
   * Scroll to a specific timestamp
   */
  scrollToTimestamp(timestamp: number): ScrollResult {
    const result = this.scrollController.scrollToTimestamp(
      this.zoomState,
      this.viewportState,
      timestamp,
      this.containerWidth
    );

    this.viewportState = result.viewport;
    this.timeConverter.setViewport(this.viewportState);
    return result;
  }

  /**
   * Scroll to make a range visible
   */
  scrollToRange(rangeStart: number, rangeEnd: number): ScrollResult | null {
    const result = this.scrollController.scrollToRange(
      this.viewportState,
      rangeStart,
      rangeEnd
    );

    if (result) {
      this.viewportState = result.viewport;
      this.timeConverter.setViewport(this.viewportState);
    }

    return result;
  }

  /**
   * Scroll by one page
   */
  scrollByPage(direction: 1 | -1): ScrollResult {
    const result = this.scrollController.scrollByPage(
      this.zoomState,
      this.viewportState,
      direction,
      this.containerWidth
    );

    this.viewportState = result.viewport;
    this.timeConverter.setViewport(this.viewportState);
    return result;
  }

  /**
   * Smoothly animate zoom and scroll to fit a specific time range in the viewport
   */
  animateToRange(rangeStart: number, rangeEnd: number, duration: number = 500, onUpdate?: () => void): Promise<void> {
    return new Promise((resolve) => {
      const startZoom = this.zoomState.pixelsPerMs;
      const startViewportStart = this.viewportState.start;
      const startViewportEnd = this.viewportState.end;

      // Calculate target state
      const rangeDuration = rangeEnd - rangeStart;
      const targetPixelsPerMs = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.containerWidth / rangeDuration)
      );

      const rangeCenter = (rangeStart + rangeEnd) / 2;
      const targetViewportDuration = this.containerWidth / targetPixelsPerMs;
      const targetViewportStart = rangeCenter - targetViewportDuration / 2;
      const targetViewportEnd = rangeCenter + targetViewportDuration / 2;

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-in-out)
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolate zoom
        this.zoomState = {
          ...this.zoomState,
          pixelsPerMs: startZoom + (targetPixelsPerMs - startZoom) * eased
        };

        // Interpolate viewport
        this.viewportState = {
          start: startViewportStart + (targetViewportStart - startViewportStart) * eased,
          end: startViewportEnd + (targetViewportEnd - startViewportEnd) * eased,
          scrollOffset: 0
        };

        // Update converters
        this.timeConverter.setZoomState(this.zoomState);
        this.timeConverter.setViewport(this.viewportState);

        // Notify update
        if (onUpdate) {
          onUpdate();
        }

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.animationFrame = null;
          resolve();
        }
      };

      // Cancel any existing animation
      if (this.animationFrame !== null) {
        cancelAnimationFrame(this.animationFrame);
      }

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  /**
   * Zoom to fit a specific time range in the viewport (instant, no animation)
   */
  zoomToRange(rangeStart: number, rangeEnd: number): { zoom: ZoomState, viewport: ViewportState } {
    const rangeDuration = rangeEnd - rangeStart;

    // Validate inputs
    if (rangeDuration <= 0) {
      console.error('Invalid range: duration must be positive');
      return { zoom: this.zoomState, viewport: this.viewportState };
    }

    if (!this.containerWidth || this.containerWidth <= 0) {
      console.error('Invalid containerWidth:', this.containerWidth);
      return { zoom: this.zoomState, viewport: this.viewportState };
    }

    // Calculate the zoom level needed to fit the range in the container
    const targetPixelsPerMs = this.containerWidth / rangeDuration;

    // Apply zoom constraints
    const constrainedZoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, targetPixelsPerMs)
    );

    // Update zoom state
    this.zoomState = {
      ...this.zoomState,
      pixelsPerMs: constrainedZoom
    };

    // Center the range in the viewport
    const rangeCenter = (rangeStart + rangeEnd) / 2;
    const viewportDuration = this.containerWidth / this.zoomState.pixelsPerMs;

    this.viewportState = {
      start: rangeCenter - viewportDuration / 2,
      end: rangeCenter + viewportDuration / 2,
      scrollOffset: 0
    };

    this.timeConverter.setZoomState(this.zoomState);
    this.timeConverter.setViewport(this.viewportState);

    return {
      zoom: this.zoomState,
      viewport: this.viewportState
    };
  }

  /**
   * Get visible grid lines
   */
  getVisibleGridLines(): GridLine[] {
    return this.gridCalculator.calculateGridLines(this.viewportState, this.zoomState);
  }

  /**
   * Get header cells
   */
  getHeaderCells(): HeaderCell[][] {
    return this.gridCalculator.calculateHeaderCells(this.viewportState, this.zoomState);
  }

  /**
   * Update container width (e.g., on window resize)
   */
  updateContainerWidth(newWidth: number): ZoomResult {
    this.containerWidth = newWidth;
    const result = this.zoomController.updateContainerWidth(
      newWidth,
      this.zoomState,
      this.viewportState
    );

    this.updateState(result);
    return result;
  }

  /**
   * Update grid calculator config
   */
  updateGridConfig(config: Partial<GridCalculatorConfig>): void {
    this.gridCalculator.updateConfig(config);
  }

  /**
   * Get the smallest visible time unit in the current zoom level
   */
  getSmallestVisibleTimeUnit(): import('./types').TimeUnit | null {
    const headerCells = this.gridCalculator.calculateHeaderCells(this.viewportState, this.zoomState);
    if (headerCells.length === 0) return null;

    // The last row is the smallest time unit
    const lastRow = headerCells[headerCells.length - 1];
    if (lastRow.length === 0) return null;

    return lastRow[0].type;
  }

  /**
   * Navigate forward by one step of the smallest visible time unit
   */
  navigateForward(onUpdate?: () => void): Promise<void> {
    const unit = this.getSmallestVisibleTimeUnit();
    if (!unit) return Promise.resolve();

    const currentStart = new Date(this.viewportState.start);
    const newStart = addTime(currentStart, 1, unit);
    const delta = newStart.getTime() - currentStart.getTime();

    return this.animateScroll(delta, 300, onUpdate);
  }

  /**
   * Navigate backward by one step of the smallest visible time unit
   */
  navigateBackward(onUpdate?: () => void): Promise<void> {
    const unit = this.getSmallestVisibleTimeUnit();
    if (!unit) return Promise.resolve();

    const currentStart = new Date(this.viewportState.start);
    const newStart = addTime(currentStart, -1, unit);
    const delta = newStart.getTime() - currentStart.getTime();

    return this.animateScroll(delta, 300, onUpdate);
  }

  /**
   * Smoothly animate a scroll by a time delta
   */
  private animateScroll(timeDelta: number, duration: number = 300, onUpdate?: () => void): Promise<void> {
    return new Promise((resolve) => {
      const startViewportStart = this.viewportState.start;
      const startViewportEnd = this.viewportState.end;
      const targetViewportStart = startViewportStart + timeDelta;
      const targetViewportEnd = startViewportEnd + timeDelta;

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);

        // Interpolate viewport
        this.viewportState = {
          start: startViewportStart + (targetViewportStart - startViewportStart) * eased,
          end: startViewportEnd + (targetViewportEnd - startViewportEnd) * eased,
          scrollOffset: 0
        };

        this.timeConverter.setViewport(this.viewportState);

        if (onUpdate) {
          onUpdate();
        }

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.animationFrame = null;
          resolve();
        }
      };

      // Cancel any existing animation
      if (this.animationFrame !== null) {
        cancelAnimationFrame(this.animationFrame);
      }

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  /**
   * Helper to update internal state from zoom/scroll results
   */
  private updateState(result: ZoomResult): void {
    this.zoomState = result.zoomState;
    this.viewportState = result.viewport;
    this.timeConverter.setZoomState(this.zoomState);
    this.timeConverter.setViewport(this.viewportState);
  }
}
