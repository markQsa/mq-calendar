import type {
  TimelineConfig,
  TimeCompressionConfig,
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
import {
  createTimeScale,
  identityTimeScale,
  virtualMidpoint,
  DEFAULT_COMPRESSION_FACTOR,
  DEFAULT_COMPRESSION_MAX_VIEWPORT_SPAN,
  type TimeScale
} from './TimeScale';
import { addTime, getStartOf, TIME_UNIT_MS } from '../utils/dateUtils';

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

  private compression: TimeCompressionConfig | null;
  private scale: TimeScale = identityTimeScale;
  /** Real-time window the current scale was resolved for */
  private scaleWindow: { start: number; end: number } | null = null;

  constructor(config: TimelineConfig) {
    this.containerWidth = config.containerWidth;

    // Apply min/max zoom constraints
    this.minZoom = config.minZoom ?? 0.000001; // ~1px per second
    this.maxZoom = config.maxZoom ?? 1; // 1px per millisecond

    this.compression = config.compression ?? null;

    const rangeStart = config.viewportStart.getTime();
    const rangeEnd = config.viewportEnd.getTime();

    // Provisional state - replaced by the zoomToRange() call below, but the
    // converters and the time scale need something to start from
    this.zoomState = {
      pixelsPerMs: this.clampZoom(config.containerWidth / Math.max(1, rangeEnd - rangeStart)),
      centerTimestamp: (rangeStart + rangeEnd) / 2
    };

    this.viewportState = {
      start: rangeStart,
      end: rangeEnd,
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

    const gridConfig: GridCalculatorConfig = {
      minSpacing: 60,
      maxSpacing: 200,
      locale: config.locale
    };
    this.gridCalculator = new GridCalculator(gridConfig);
    this.timeConverter = new TimeConverter(this.zoomState, this.viewportState, this.scale);

    // Resolve compression for the initial range, then fit that range
    this.syncScale(rangeStart, rangeEnd);

    if (rangeEnd > rangeStart && this.containerWidth > 0) {
      this.zoomToRange(rangeStart, rangeEnd);
    } else {
      // Degenerate config (empty range or unmeasured container): keep one
      // container width centred on the range
      const viewportDuration = this.containerWidth / this.zoomState.pixelsPerMs;
      const center = virtualMidpoint(this.scale, rangeStart, rangeEnd);

      this.viewportState = {
        start: this.scale.advance(center, -viewportDuration / 2),
        end: this.scale.advance(center, viewportDuration / 2),
        scrollOffset: 0
      };
      this.timeConverter.setViewport(this.viewportState);
    }
  }

  /**
   * Clamp a zoom level to the configured limits
   */
  private clampZoom(pixelsPerMs: number): number {
    return Math.max(this.minZoom, Math.min(this.maxZoom, pixelsPerMs));
  }

  /**
   * Make sure the time scale covers `[start, end]`.
   *
   * Compressed ranges are resolved lazily for a window around the viewport, so
   * that a timeline spanning years never has to enumerate every closed period.
   * Compression is skipped entirely for viewports wider than
   * `compression.maxViewportSpan`, where closed periods are sub-pixel anyway.
   */
  private syncScale(
    start: number = this.viewportState.start,
    end: number = this.viewportState.end
  ): void {
    if (!this.compression) return;

    const span = end - start;
    const maxSpan = this.compression.maxViewportSpan ?? DEFAULT_COMPRESSION_MAX_VIEWPORT_SPAN;

    if (!(span > 0) || span > maxSpan) {
      if (!this.scale.isIdentity) {
        this.scaleWindow = null;
        this.setScale(identityTimeScale);
      }
      return;
    }

    // Current window still covers the requested range - nothing to do
    if (this.scaleWindow && start >= this.scaleWindow.start && end <= this.scaleWindow.end) {
      return;
    }

    // Resolve a window of ~3 viewports so scrolling doesn't rebuild every frame
    const padding = Math.max(span, TIME_UNIT_MS.day);
    const windowStart = getStartOf(new Date(start - padding), 'day').getTime();
    const windowEnd = addTime(getStartOf(new Date(end + padding), 'day'), 1, 'day').getTime();

    const ranges = this.compression.getRanges(windowStart, windowEnd);
    this.scaleWindow = { start: windowStart, end: windowEnd };
    this.setScale(createTimeScale(ranges, this.compression.factor ?? DEFAULT_COMPRESSION_FACTOR));
  }

  /**
   * Install a new time scale.
   *
   * When the new scale changes the visible span (compression turning on or off)
   * the zoom level is refitted so the same real time range stays visible.
   * Merely widening the resolved window leaves the zoom untouched.
   */
  private setScale(scale: TimeScale): void {
    const previousSpan = this.scale.virtualSpan(this.viewportState.start, this.viewportState.end);
    const nextSpan = scale.virtualSpan(this.viewportState.start, this.viewportState.end);

    this.scale = scale;
    this.timeConverter.setScale(scale);

    if (nextSpan > 0 && Math.abs(nextSpan - previousSpan) > 1) {
      this.zoomState = {
        ...this.zoomState,
        pixelsPerMs: this.clampZoom(this.containerWidth / nextSpan)
      };
      this.timeConverter.setZoomState(this.zoomState);
    }
  }

  /**
   * Enable, replace, or remove time-axis compression
   */
  setCompression(compression: TimeCompressionConfig | null): void {
    this.compression = compression;
    this.scaleWindow = null;

    if (!compression) {
      this.setScale(identityTimeScale);
      return;
    }

    this.syncScale();
  }

  /**
   * Get the current time scale (identity unless the axis is compressed)
   */
  getTimeScale(): TimeScale {
    return this.scale;
  }

  /**
   * Derive a viewport that starts at `start` and is exactly one container wide
   */
  private viewportFromStart(start: number, scrollOffset = 0): ViewportState {
    return {
      start,
      end: this.scale.advance(start, this.containerWidth / this.zoomState.pixelsPerMs),
      scrollOffset
    };
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
    this.syncScale();
    return this.timeConverter.timeToPixel(timestamp);
  }

  /**
   * Convert pixel position to timestamp
   */
  pixelToTime(pixel: number): number {
    this.syncScale();
    return this.timeConverter.pixelToTime(pixel);
  }

  /**
   * Convert a time range to its pixel width.
   *
   * Prefer this over {@link durationToPixels} when drawing on the timeline:
   * a bare duration cannot account for compressed ranges.
   */
  rangeToPixels(startTimestamp: number, endTimestamp: number): number {
    this.syncScale();
    return this.timeConverter.rangeToPixels(startTimestamp, endTimestamp);
  }

  /**
   * Convert duration to pixels (ignores axis compression)
   */
  durationToPixels(durationMs: number): number {
    return this.timeConverter.durationToPixels(durationMs);
  }

  /**
   * Apply zoom operation
   */
  zoom(zoomDelta: number, focalPointX: number): ZoomResult {
    this.syncScale();
    const result = this.zoomController.applyZoom(
      this.zoomState,
      this.viewportState,
      zoomDelta,
      focalPointX,
      this.scale
    );

    this.updateState(result);
    return result;
  }

  /**
   * Zoom in
   */
  zoomIn(focalPointX?: number): ZoomResult {
    this.syncScale();
    const result = this.zoomController.zoomIn(
      this.zoomState,
      this.viewportState,
      focalPointX,
      this.scale
    );
    this.updateState(result);
    return result;
  }

  /**
   * Zoom out
   */
  zoomOut(focalPointX?: number): ZoomResult {
    this.syncScale();
    const result = this.zoomController.zoomOut(
      this.zoomState,
      this.viewportState,
      focalPointX,
      this.scale
    );
    this.updateState(result);
    return result;
  }

  /**
   * Zoom to fit a specific time range
   */
  zoomToFit(startTime: number, endTime: number): ZoomResult {
    this.syncScale(startTime, endTime);
    const result = this.zoomController.zoomToFit(startTime, endTime, this.scale);
    this.updateState(result);
    return result;
  }

  /**
   * Apply scroll operation
   */
  scroll(deltaPixels: number): ScrollResult {
    this.syncScale();
    const result = this.scrollController.applyScroll(
      this.zoomState,
      this.viewportState,
      deltaPixels,
      this.scale
    );

    this.setViewport(result.viewport);
    return result;
  }

  /**
   * Scroll to a specific timestamp
   */
  scrollToTimestamp(timestamp: number): ScrollResult {
    this.syncScale();
    const result = this.scrollController.scrollToTimestamp(
      this.zoomState,
      this.viewportState,
      timestamp,
      this.containerWidth,
      this.scale
    );

    this.setViewport(result.viewport);
    return result;
  }

  /**
   * Scroll to make a range visible
   */
  scrollToRange(rangeStart: number, rangeEnd: number): ScrollResult | null {
    this.syncScale();
    const result = this.scrollController.scrollToRange(
      this.viewportState,
      rangeStart,
      rangeEnd,
      this.scale
    );

    if (result) {
      this.setViewport(result.viewport);
    }

    return result;
  }

  /**
   * Scroll by one page
   */
  scrollByPage(direction: 1 | -1): ScrollResult {
    this.syncScale();
    const result = this.scrollController.scrollByPage(
      this.zoomState,
      this.viewportState,
      direction,
      this.containerWidth,
      this.scale
    );

    this.setViewport(result.viewport);
    return result;
  }

  /**
   * Smoothly animate zoom and scroll to fit a specific time range in the viewport
   */
  animateToRange(rangeStart: number, rangeEnd: number, duration: number = 500, onUpdate?: () => void): Promise<void> {
    return new Promise((resolve) => {
      // Resolve compression for both the current and the target range so the
      // scale stays stable for the whole animation
      this.syncScale(
        Math.min(this.viewportState.start, rangeStart),
        Math.max(this.viewportState.end, rangeEnd)
      );

      const startZoom = this.zoomState.pixelsPerMs;
      const startViewportStart = this.viewportState.start;
      const startViewportEnd = this.viewportState.end;

      // Calculate target state
      const rangeDuration = this.scale.virtualSpan(rangeStart, rangeEnd);
      const targetPixelsPerMs = this.clampZoom(this.containerWidth / rangeDuration);

      const rangeCenter = virtualMidpoint(this.scale, rangeStart, rangeEnd);
      const targetViewportDuration = this.containerWidth / targetPixelsPerMs;
      const targetViewportStart = this.scale.advance(rangeCenter, -targetViewportDuration / 2);
      const targetViewportEnd = this.scale.advance(rangeCenter, targetViewportDuration / 2);

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
    // Validate inputs
    if (rangeEnd - rangeStart <= 0) {
      console.error('Invalid range: duration must be positive');
      return { zoom: this.zoomState, viewport: this.viewportState };
    }

    if (!this.containerWidth || this.containerWidth <= 0) {
      console.error('Invalid containerWidth:', this.containerWidth);
      return { zoom: this.zoomState, viewport: this.viewportState };
    }

    this.syncScale(rangeStart, rangeEnd);

    // Calculate the zoom level needed to fit the range in the container
    const rangeDuration = this.scale.virtualSpan(rangeStart, rangeEnd);
    const targetPixelsPerMs = this.containerWidth / rangeDuration;

    // Update zoom state (with zoom constraints applied)
    this.zoomState = {
      ...this.zoomState,
      pixelsPerMs: this.clampZoom(targetPixelsPerMs)
    };

    // Center the range in the viewport
    const rangeCenter = virtualMidpoint(this.scale, rangeStart, rangeEnd);
    const viewportDuration = this.containerWidth / this.zoomState.pixelsPerMs;

    this.viewportState = {
      start: this.scale.advance(rangeCenter, -viewportDuration / 2),
      end: this.scale.advance(rangeCenter, viewportDuration / 2),
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
    this.syncScale();
    return this.gridCalculator.calculateGridLines(this.viewportState, this.zoomState, this.scale);
  }

  /**
   * Get header cells
   */
  getHeaderCells(): HeaderCell[][] {
    this.syncScale();
    return this.gridCalculator.calculateHeaderCells(this.viewportState, this.zoomState, this.scale);
  }

  /**
   * Update container width (e.g., on window resize)
   */
  updateContainerWidth(newWidth: number): ZoomResult {
    this.containerWidth = newWidth;
    this.syncScale();
    const result = this.zoomController.updateContainerWidth(
      newWidth,
      this.zoomState,
      this.viewportState,
      this.scale
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
  animateScroll(timeDelta: number, duration: number = 300, onUpdate?: () => void): Promise<void> {
    return new Promise((resolve) => {
      const startViewportStart = this.viewportState.start;

      // Resolve compression across the whole travelled range up front
      this.syncScale(
        Math.min(startViewportStart, startViewportStart + timeDelta),
        Math.max(this.viewportState.end, this.viewportState.end + timeDelta)
      );

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);

        // Interpolate viewport (the end follows from the container width, so a
        // compressed axis keeps filling the viewport exactly)
        this.viewportState = this.viewportFromStart(startViewportStart + timeDelta * eased);

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
   * Cancel any running scroll/zoom animation
   */
  cancelAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Snap the viewport to the nearest time grid boundary
   */
  snapToGrid(duration: number = 200, onUpdate?: () => void): Promise<void> {
    const unit = this.getSmallestVisibleTimeUnit();
    if (!unit) return Promise.resolve();

    const viewportStart = new Date(this.viewportState.start);

    // Get the previous boundary (floor)
    const prevBoundary = getStartOf(viewportStart, unit);
    // Get the next boundary
    const nextBoundary = addTime(prevBoundary, 1, unit);

    const prevDelta = this.viewportState.start - prevBoundary.getTime();
    const nextDelta = nextBoundary.getTime() - this.viewportState.start;

    // Pick whichever boundary is closer
    const timeDelta = prevDelta <= nextDelta
      ? -prevDelta   // snap backward to previous boundary
      : nextDelta;   // snap forward to next boundary

    // Skip if already very close to a boundary (< 1ms)
    if (Math.abs(timeDelta) < 1) return Promise.resolve();

    return this.animateScroll(timeDelta, duration, onUpdate);
  }

  /**
   * Helper to update internal state from zoom/scroll results
   */
  private updateState(result: ZoomResult): void {
    this.zoomState = result.zoomState;
    this.viewportState = result.viewport;
    this.timeConverter.setZoomState(this.zoomState);
    this.timeConverter.setViewport(this.viewportState);

    // Keep the resolved compression window ahead of the new viewport
    this.syncScale();
  }

  /**
   * Helper to update the viewport after a scroll result
   */
  private setViewport(viewport: ViewportState): void {
    this.viewportState = viewport;
    this.timeConverter.setViewport(this.viewportState);

    // Keep the resolved compression window ahead of the new viewport
    this.syncScale();
  }
}
