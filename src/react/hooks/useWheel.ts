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
        // Regular scroll
        event.preventDefault();
        options.onWheel(event.deltaX, event.deltaY, event);
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [ref, options]);
}
