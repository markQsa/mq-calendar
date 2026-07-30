import type { ZoomState, ViewportState, ScrollResult } from './types';
import { identityTimeScale, virtualMidpoint, type TimeScale } from './TimeScale';

/**
 * Handles smooth scrolling operations
 *
 * Every method takes an optional {@link TimeScale} so a compressed axis moves
 * by pixels, not by raw milliseconds. With the default identity scale the math
 * reduces to plain linear time.
 */
export class ScrollController {
  /**
   * Apply horizontal scroll
   * @param currentZoom - Current zoom state
   * @param currentViewport - Current viewport state
   * @param deltaPixels - Number of pixels to scroll (positive = scroll right/forward in time)
   * @param scale - Time scale of the axis
   * @returns New viewport state
   */
  applyScroll(
    currentZoom: ZoomState,
    currentViewport: ViewportState,
    deltaPixels: number,
    scale: TimeScale = identityTimeScale
  ): ScrollResult {
    // Convert pixel delta to a delta in virtual time
    const virtualDelta = deltaPixels / currentZoom.pixelsPerMs;

    return {
      viewport: {
        start: scale.advance(currentViewport.start, virtualDelta),
        end: scale.advance(currentViewport.end, virtualDelta),
        scrollOffset: currentViewport.scrollOffset + deltaPixels
      }
    };
  }

  /**
   * Scroll to a specific timestamp, centering it in the viewport
   * @param currentZoom - Current zoom state
   * @param currentViewport - Current viewport state
   * @param timestamp - Timestamp to scroll to
   * @param containerWidth - Width of the container
   * @param scale - Time scale of the axis
   * @returns New viewport state
   */
  scrollToTimestamp(
    currentZoom: ZoomState,
    _currentViewport: ViewportState,
    timestamp: number,
    containerWidth: number,
    scale: TimeScale = identityTimeScale
  ): ScrollResult {
    // Calculate the (virtual) duration that fits in the viewport
    const viewportDuration = containerWidth / currentZoom.pixelsPerMs;

    return {
      viewport: {
        // Center the timestamp
        start: scale.advance(timestamp, -viewportDuration / 2),
        end: scale.advance(timestamp, viewportDuration / 2),
        scrollOffset: 0 // Reset scroll offset when jumping to a timestamp
      }
    };
  }

  /**
   * Scroll to make a specific time range visible
   * @param currentViewport - Current viewport state
   * @param rangeStart - Start of the range to make visible
   * @param rangeEnd - End of the range to make visible
   * @param scale - Time scale of the axis
   * @returns New viewport state, or null if range is already fully visible
   */
  scrollToRange(
    currentViewport: ViewportState,
    rangeStart: number,
    rangeEnd: number,
    scale: TimeScale = identityTimeScale
  ): ScrollResult | null {
    // Check if range is already fully visible
    if (rangeStart >= currentViewport.start && rangeEnd <= currentViewport.end) {
      return null;
    }

    // Visible width of the viewport, in virtual time
    const viewportDuration = scale.virtualSpan(currentViewport.start, currentViewport.end);

    // If range is outside the viewport, align the viewport with the range start
    if (rangeEnd < currentViewport.start || rangeStart > currentViewport.end) {
      return {
        viewport: {
          start: rangeStart,
          end: scale.advance(rangeStart, viewportDuration),
          scrollOffset: currentViewport.scrollOffset
        }
      };
    }

    // Range partially overlaps, center it
    const rangeCenter = virtualMidpoint(scale, rangeStart, rangeEnd);

    return {
      viewport: {
        start: scale.advance(rangeCenter, -viewportDuration / 2),
        end: scale.advance(rangeCenter, viewportDuration / 2),
        scrollOffset: currentViewport.scrollOffset
      }
    };
  }

  /**
   * Scroll by a page (one viewport width)
   * @param currentZoom - Current zoom state
   * @param currentViewport - Current viewport state
   * @param direction - 1 for forward, -1 for backward
   * @param containerWidth - Width of the container
   * @param scale - Time scale of the axis
   * @returns New viewport state
   */
  scrollByPage(
    currentZoom: ZoomState,
    currentViewport: ViewportState,
    direction: 1 | -1,
    containerWidth: number,
    scale: TimeScale = identityTimeScale
  ): ScrollResult {
    const pixelDelta = containerWidth * direction;
    return this.applyScroll(currentZoom, currentViewport, pixelDelta, scale);
  }
}
