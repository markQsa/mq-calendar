import { useMemo } from 'react';
import { useTimelineContext } from '../headless/TimelineContext';
import type { TimeValue, DurationValue } from '../../utils/timeTypes';

export interface VisibleItemsFilter {
  id: string | number;
  startTime: TimeValue;
  duration?: DurationValue;
  endTime?: TimeValue;
  [key: string]: any;
}

/**
 * Hook to filter timeline items based on viewport visibility
 * Only returns items that intersect with the current viewport
 *
 * This is critical for performance with large datasets (1000+ items)
 *
 * @example
 * ```tsx
 * const visibleOrders = useVisibleItems(allOrders);
 *
 * return (
 *   <TimelineRow>
 *     {visibleOrders.map(order => (
 *       <TimelineItem key={order.id} startTime={order.startTime} duration={order.duration}>
 *         {order.title}
 *       </TimelineItem>
 *     ))}
 *   </TimelineRow>
 * );
 * ```
 */
export function useVisibleItems<T extends VisibleItemsFilter>(
  items: T[]
): T[] {
  const { engine, timeConverter, refreshCounter } = useTimelineContext();

  return useMemo(() => {
    if (!engine || items.length === 0) {
      return items;
    }

    const viewport = engine.getViewportState();
    const viewportStart = viewport.start;
    const viewportEnd = viewport.end;

    return items.filter((item) => {
      try {
        const startTimestamp = timeConverter.toTimestamp(item.startTime);

        // Calculate item end time
        let itemEndTimestamp: number;

        if (item.endTime) {
          itemEndTimestamp = timeConverter.toTimestamp(item.endTime);
        } else if (item.duration !== undefined) {
          const durationMs = timeConverter.parseDuration?.(item.duration) ??
            (typeof item.duration === 'number' ? item.duration : 0);
          itemEndTimestamp = startTimestamp + durationMs;
        } else {
          // No duration - treat as point in time
          itemEndTimestamp = startTimestamp;
        }

        // Check if item intersects with viewport
        return itemEndTimestamp >= viewportStart && startTimestamp <= viewportEnd;
      } catch (error) {
        // If conversion fails, include the item
        console.warn('Failed to check visibility for item:', item, error);
        return true;
      }
    });
  }, [items, engine, timeConverter, refreshCounter]);
}
