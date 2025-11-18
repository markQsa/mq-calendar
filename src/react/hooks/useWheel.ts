import { useEffect, RefObject } from 'react';

export interface UseWheelOptions {
  onWheel: (deltaX: number, deltaY: number, event: WheelEvent) => void;
  onZoom?: (delta: number, clientX: number, clientY: number) => void;
}

/**
 * Hook to handle wheel events (scroll and zoom)
 */
export function useWheel(ref: RefObject<HTMLElement>, options: UseWheelOptions): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      // Check if this is a zoom gesture (Ctrl/Cmd + wheel or pinch)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        if (options.onZoom) {
          // Zoom factor based on deltaY
          const delta = event.deltaY > 0 ? 0.9 : 1.1;

          // Get mouse position relative to element
          const rect = element.getBoundingClientRect();
          const clientX = event.clientX - rect.left;
          const clientY = event.clientY - rect.top;

          options.onZoom(delta, clientX, clientY);
        }
      } else {
        // Check if the event happened over the header area
        const target = event.target as HTMLElement;
        const isOverHeader = target?.closest('[data-timeline-header]') !== null;

        // Detect scroll direction
        const isHorizontalScroll = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const isShiftPressed = event.shiftKey;

        // Handle horizontal timeline scrolling when:
        // 1. Primary scroll direction is horizontal, OR
        // 2. Shift key is pressed (allows vertical wheel to scroll timeline), OR
        // 3. Over header area (vertical scroll should scroll timeline, not content)
        if (isHorizontalScroll || isShiftPressed || isOverHeader) {
          event.preventDefault();

          // Use deltaX for horizontal scroll, or deltaY when over header/Shift is pressed
          const scrollDelta = isHorizontalScroll ? event.deltaX : event.deltaY;
          options.onWheel(scrollDelta, 0, event);
        }
        // Otherwise, allow natural vertical scrolling (don't preventDefault)
        // This enables the content area's native vertical scroll
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [ref, options]);
}
