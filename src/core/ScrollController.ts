import type { ZoomState, ViewportState, ScrollResult } from './types';

/**
 * Handles smooth scrolling operations
 */
export class ScrollController {
  /**
   * Apply horizontal scroll
   * @param currentZoom - Current zoom state
   * @param currentViewport - Current viewport state
   * @param deltaPixels - Number of pixels to scroll (positive = scroll right/forward in time)
   * @returns New viewport state
   */
  applyScroll(
    currentZoom: ZoomState,
    currentViewport: ViewportState,
    deltaPixels: number
  ): ScrollResult {
    // Convert pixel delta to time delta
    const timeDelta = deltaPixels / currentZoom.pixelsPerMs;

    return {
      viewport: {
        start: currentViewport.start + timeDelta,
        end: currentViewport.end + timeDelta,
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
   * @returns New viewport state
   */
  scrollToTimestamp(
    currentZoom: ZoomState,
    _currentViewport: ViewportState,
    timestamp: number,
    containerWidth: number
  ): ScrollResult {
    // Calculate the duration that fits in the viewport
    const viewportDuration = containerWidth / currentZoom.pixelsPerMs;

    // Center the timestamp
    const newStart = timestamp - viewportDuration / 2;
    const newEnd = timestamp + viewportDuration / 2;

    return {
      viewport: {
        start: newStart,
        end: newEnd,
        scrollOffset: 0 // Reset scroll offset when jumping to a timestamp
      }
    };
  }

  /**
   * Scroll to make a specific time range visible
   * @param currentViewport - Current viewport state
   * @param rangeStart - Start of the range to make visible
   * @param rangeEnd - End of the range to make visible
   * @returns New viewport state, or null if range is already fully visible
   */
  scrollToRange(
    currentViewport: ViewportState,
    rangeStart: number,
    rangeEnd: number
  ): ScrollResult | null {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Check if range is already fully visible
    if (rangeStart >= currentViewport.start && rangeEnd <= currentViewport.end) {
      return null;
    }

    // If range is before viewport, scroll to show range start
    if (rangeEnd < currentViewport.start) {
      const scrollAmount = currentViewport.start - rangeStart;
      return {
        viewport: {
          start: rangeStart,
          end: currentViewport.end - scrollAmount,
          scrollOffset: currentViewport.scrollOffset
        }
      };
    }

    // If range is after viewport, scroll to show range end
    if (rangeStart > currentViewport.end) {
      const scrollAmount = rangeStart - currentViewport.start;
      return {
        viewport: {
          start: rangeStart,
          end: currentViewport.end + scrollAmount,
          scrollOffset: currentViewport.scrollOffset
        }
      };
    }

    // Range partially overlaps, center it
    const rangeDuration = rangeEnd - rangeStart;
    const viewportDuration = currentViewport.end - currentViewport.start;
    const rangeCenter = rangeStart + rangeDuration / 2;

    return {
      viewport: {
        start: rangeCenter - viewportDuration / 2,
        end: rangeCenter + viewportDuration / 2,
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
   * @returns New viewport state
   */
  scrollByPage(
    currentZoom: ZoomState,
    currentViewport: ViewportState,
    direction: 1 | -1,
    containerWidth: number
  ): ScrollResult {
    const pixelDelta = containerWidth * direction;
    return this.applyScroll(currentZoom, currentViewport, pixelDelta);
  }
}
