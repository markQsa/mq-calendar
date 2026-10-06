import { useEffect, RefObject } from 'react';

export interface UseWheelOptions {
  onWheel: (deltaX: number, deltaY: number, event: WheelEvent) => void;
  onZoom?: (delta: number, clientX: number, clientY: number) => void;
}

/**
 * Firefox often reports wheel deltas in lines (deltaMode === 1) or pages
 * (deltaMode === 2) instead of pixels. 16px matches a typical CSS line-height.
 */
const LINE_HEIGHT_PX = 16;

function normalizeDelta(delta: number, deltaMode: number, pageSizePx: number): number {
  if (deltaMode === 1) {
    return delta * LINE_HEIGHT_PX;
  }
  if (deltaMode === 2) {
    return delta * pageSizePx;
  }
  return delta;
}

/**
 * Hook to handle wheel events (scroll and zoom)
 */
export function useWheel(ref: RefObject<HTMLElement>, options: UseWheelOptions): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId: number | null = null;
    let pendingDeltaX = 0;
    let pendingDeltaY = 0;
    let pendingEvent: WheelEvent | null = null;
    let pendingZoom: { delta: number; clientX: number; clientY: number } | null = null;

    const processUpdates = () => {
      rafId = null;

      if (pendingZoom) {
        const { delta, clientX, clientY } = pendingZoom;
        pendingZoom = null;
        const rect = element.getBoundingClientRect();
        options.onZoom?.(delta, clientX - rect.left, clientY - rect.top);
      } else if ((pendingDeltaX !== 0 || pendingDeltaY !== 0) && pendingEvent) {
        const dx = pendingDeltaX;
        const dy = pendingDeltaY;
        const event = pendingEvent;
        pendingDeltaX = 0;
        pendingDeltaY = 0;
        pendingEvent = null;
        options.onWheel(dx, dy, event);
      }
    };

    const scheduleFrame = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(processUpdates);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const mode = event.deltaMode;
      // Page-mode is rare; skip layout reads on the pixel/line path Firefox uses.
      const pageWidth = mode === 2 ? element.clientWidth || 1 : 1;
      const pageHeight = mode === 2 ? element.clientHeight || 1 : 1;
      const deltaX = normalizeDelta(event.deltaX, mode, pageWidth);
      const deltaY = normalizeDelta(event.deltaY, mode, pageHeight);

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        if (options.onZoom) {
          // Zoom direction uses only the sign of deltaY.
          const delta = deltaY > 0 ? 0.9 : 1.1;
          pendingZoom = { delta, clientX: event.clientX, clientY: event.clientY };
          scheduleFrame();
        }
        return;
      }

      const target = event.target as HTMLElement;
      const isOverHeader = target?.closest('[data-timeline-header]') !== null;
      const isHorizontalScroll = Math.abs(deltaX) > Math.abs(deltaY);
      const isShiftPressed = event.shiftKey;

      // Handle horizontal timeline scrolling when:
      // 1. Primary scroll direction is horizontal, OR
      // 2. Shift key is pressed (allows vertical wheel to scroll timeline), OR
      // 3. Over header area (vertical scroll should scroll timeline, not content)
      if (isHorizontalScroll || isShiftPressed || isOverHeader) {
        event.preventDefault();

        const scrollDelta = isHorizontalScroll ? deltaX : deltaY;
        pendingDeltaX += scrollDelta;
        pendingEvent = event;
        scheduleFrame();
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      element.removeEventListener('wheel', handleWheel);
    };
  }, [ref, options]);
}
