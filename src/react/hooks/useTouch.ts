import { useEffect, RefObject } from 'react';

export interface UseTouchOptions {
  /** Callback for horizontal scroll */
  onScroll?: (deltaX: number) => void;
  /** Callback for pinch zoom */
  onZoom?: (delta: number, centerX: number) => void;
}

interface TouchState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startDistance: number | null;
  startCenterX: number | null;
  isScrolling: boolean;
  isPinching: boolean;
}

/**
 * Calculate distance between two touch points
 */
function getTouchDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point between two touches
 */
function getTouchCenter(touch1: Touch, touch2: Touch, containerRect: DOMRect): number {
  const centerX = (touch1.clientX + touch2.clientX) / 2;
  return centerX - containerRect.left;
}

/**
 * Hook for handling touch events (scroll and pinch-to-zoom)
 */
export function useTouch(
  ref: RefObject<HTMLElement>,
  options: UseTouchOptions
): void {
  const { onScroll, onZoom } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let touchState: TouchState = {
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startDistance: null,
      startCenterX: null,
      isScrolling: false,
      isPinching: false
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - prepare for scrolling
        const touch = e.touches[0];
        touchState.startX = touch.clientX;
        touchState.startY = touch.clientY;
        touchState.lastX = touch.clientX;
        touchState.lastY = touch.clientY;
        touchState.isScrolling = false;
        touchState.isPinching = false;
        touchState.startDistance = null;
        touchState.startCenterX = null;
      } else if (e.touches.length === 2) {
        // Two touches - prepare for pinching
        e.preventDefault(); // Prevent default pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const rect = element.getBoundingClientRect();

        touchState.startDistance = getTouchDistance(touch1, touch2);
        touchState.startCenterX = getTouchCenter(touch1, touch2, rect);
        touchState.isPinching = true;
        touchState.isScrolling = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && !touchState.isPinching) {
        // Single touch - scrolling
        const touch = e.touches[0];
        const deltaX = touchState.lastX - touch.clientX;
        const deltaY = touchState.lastY - touch.clientY;

        // Determine if this is horizontal scrolling
        if (!touchState.isScrolling) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          // If horizontal movement is greater, treat as horizontal scroll
          if (absX > absY && absX > 5) {
            touchState.isScrolling = true;
          }
        }

        if (touchState.isScrolling) {
          e.preventDefault(); // Prevent page scroll

          if (onScroll && Math.abs(deltaX) > 0) {
            onScroll(deltaX);
          }
        }

        touchState.lastX = touch.clientX;
        touchState.lastY = touch.clientY;
      } else if (e.touches.length === 2 && touchState.isPinching) {
        // Two touches - pinch zoom
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const rect = element.getBoundingClientRect();

        const currentDistance = getTouchDistance(touch1, touch2);
        const currentCenterX = getTouchCenter(touch1, touch2, rect);

        if (touchState.startDistance && onZoom) {
          // Calculate zoom delta based on distance change
          const distanceRatio = currentDistance / touchState.startDistance;
          // Convert to zoom delta (similar to wheel delta)
          // Positive delta = zoom in, negative = zoom out
          const zoomDelta = (distanceRatio - 1) * 100;

          // Use the center point for zoom
          const centerX = touchState.startCenterX ?? currentCenterX;

          onZoom(zoomDelta, centerX);

          // Update for next move
          touchState.startDistance = currentDistance;
          touchState.startCenterX = currentCenterX;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        // All touches ended
        touchState.isScrolling = false;
        touchState.isPinching = false;
        touchState.startDistance = null;
        touchState.startCenterX = null;
      } else if (e.touches.length === 1) {
        // Went from 2 touches to 1 - restart scrolling state
        const touch = e.touches[0];
        touchState.startX = touch.clientX;
        touchState.startY = touch.clientY;
        touchState.lastX = touch.clientX;
        touchState.lastY = touch.clientY;
        touchState.isScrolling = false;
        touchState.isPinching = false;
        touchState.startDistance = null;
        touchState.startCenterX = null;
      }
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [ref, onScroll, onZoom]);
}
