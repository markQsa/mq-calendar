import { useEffect, useRef, RefObject } from 'react';

export interface UseTouchOptions {
  /** Callback for horizontal scroll */
  onScroll?: (deltaX: number) => void;
  /** Callback for pinch zoom */
  onZoom?: (delta: number, centerX: number) => void;
  /** Enable momentum scrolling after touch release (default: true) */
  momentum?: boolean;
  /** Deceleration rate for momentum (0-1, default: 0.95) */
  decelerationRate?: number;
  /** Called when momentum scrolling starts */
  onMomentumStart?: () => void;
  /** Called when momentum scrolling ends */
  onMomentumEnd?: () => void;
  /** Called when the entire touch scroll gesture is complete (after momentum finishes, or immediately if no momentum) */
  onTouchScrollEnd?: () => void;
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

interface VelocitySample {
  x: number;
  timestamp: number;
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
 * Hook for handling touch events (scroll and pinch-to-zoom) with momentum
 */
export function useTouch(
  ref: RefObject<HTMLElement>,
  options: UseTouchOptions
): void {
  const {
    onScroll,
    onZoom,
    momentum = true,
    decelerationRate = 0.95,
    onMomentumStart,
    onMomentumEnd,
    onTouchScrollEnd
  } = options;

  // Use refs for callbacks to avoid re-attaching listeners
  const onScrollRef = useRef(onScroll);
  const onZoomRef = useRef(onZoom);
  const onMomentumStartRef = useRef(onMomentumStart);
  const onMomentumEndRef = useRef(onMomentumEnd);
  const onTouchScrollEndRef = useRef(onTouchScrollEnd);
  onScrollRef.current = onScroll;
  onZoomRef.current = onZoom;
  onMomentumStartRef.current = onMomentumStart;
  onMomentumEndRef.current = onMomentumEnd;
  onTouchScrollEndRef.current = onTouchScrollEnd;

  const momentumRafRef = useRef<number | null>(null);

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

    // Velocity tracking: keep last 5 samples
    let velocitySamples: VelocitySample[] = [];

    const cancelMomentum = () => {
      if (momentumRafRef.current !== null) {
        cancelAnimationFrame(momentumRafRef.current);
        momentumRafRef.current = null;
        onMomentumEndRef.current?.();
      }
    };

    const startMomentum = (velocityPxPerMs: number): boolean => {
      if (!momentum || Math.abs(velocityPxPerMs) < 0.1) return false;

      let velocity = velocityPxPerMs;
      let lastFrameTime = performance.now();

      onMomentumStartRef.current?.();

      const tick = () => {
        const now = performance.now();
        const elapsed = now - lastFrameTime;
        lastFrameTime = now;

        // Apply deceleration
        velocity *= Math.pow(decelerationRate, elapsed / 16.67); // Normalize to ~60fps

        if (Math.abs(velocity) < 0.05) {
          momentumRafRef.current = null;
          onMomentumEndRef.current?.();
          onTouchScrollEndRef.current?.();
          return;
        }

        // deltaX = velocity (px/ms) * elapsed (ms)
        const deltaX = velocity * elapsed;
        onScrollRef.current?.(deltaX);

        momentumRafRef.current = requestAnimationFrame(tick);
      };

      momentumRafRef.current = requestAnimationFrame(tick);
      return true;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Cancel any ongoing momentum (catch-to-stop)
      cancelMomentum();

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
        velocitySamples = [];
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
        velocitySamples = [];
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

          if (onScrollRef.current && Math.abs(deltaX) > 0) {
            onScrollRef.current(deltaX);
          }

          // Record velocity sample
          const now = performance.now();
          velocitySamples.push({ x: deltaX, timestamp: now });
          // Keep only last 5 samples
          if (velocitySamples.length > 5) {
            velocitySamples.shift();
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

        if (touchState.startDistance && onZoomRef.current) {
          // Calculate zoom delta based on distance change
          const distanceRatio = currentDistance / touchState.startDistance;
          // Convert to zoom delta (similar to wheel delta)
          // Positive delta = zoom in, negative = zoom out
          const zoomDelta = (distanceRatio - 1) * 100;

          // Use the center point for zoom
          const centerX = touchState.startCenterX ?? currentCenterX;

          onZoomRef.current(zoomDelta, centerX);

          // Update for next move
          touchState.startDistance = currentDistance;
          touchState.startCenterX = currentCenterX;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        // All touches ended - compute velocity and start momentum
        let momentumStarted = false;
        const wasScrolling = touchState.isScrolling;

        if (wasScrolling && momentum) {
          const now = performance.now();
          // Use samples within last 100ms
          const recentSamples = velocitySamples.filter(s => now - s.timestamp < 100);

          if (recentSamples.length >= 2) {
            const totalDeltaX = recentSamples.reduce((sum, s) => sum + s.x, 0);
            const timeSpan = recentSamples[recentSamples.length - 1].timestamp - recentSamples[0].timestamp;

            if (timeSpan > 0) {
              const velocityPxPerMs = totalDeltaX / timeSpan;
              momentumStarted = startMomentum(velocityPxPerMs);
            }
          }
        }

        // If we were scrolling but momentum didn't start, fire onTouchScrollEnd immediately
        if (wasScrolling && !momentumStarted) {
          onTouchScrollEndRef.current?.();
        }

        touchState.isScrolling = false;
        touchState.isPinching = false;
        touchState.startDistance = null;
        touchState.startCenterX = null;
        velocitySamples = [];
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
        velocitySamples = [];
      }
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    // Cleanup
    return () => {
      cancelMomentum();
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [ref, momentum, decelerationRate]);
}
