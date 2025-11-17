import React, { useMemo } from 'react';
import type { TimelineItemProps } from '../types';
import { useTimelineContext } from './TimelineContext';

/**
 * Item component for positioning content at specific times
 */
export const TimelineItem: React.FC<TimelineItemProps> = ({
  startTime,
  duration,
  endTime,
  row = 0,
  className,
  style,
  children
}) => {
  const { engine, timeConverter, refreshCounter } = useTimelineContext();

  // Calculate position, width, and visibility
  const { left, width, isVisible } = useMemo(() => {
    if (!engine) return { left: 0, width: 0, isVisible: false };

    // Convert start time to timestamp
    const startTimestamp = timeConverter.toTimestamp(startTime);

    // Calculate duration
    let durationMs: number;
    if (endTime) {
      // If endTime is provided, calculate duration from start to end
      const endTimestamp = timeConverter.toTimestamp(endTime);
      durationMs = endTimestamp - startTimestamp;
    } else {
      // Parse duration (supports both numbers and human-readable strings)
      durationMs = timeConverter.parseDuration?.(duration) ?? (typeof duration === 'number' ? duration : 0);
    }

    const itemEndTimestamp = startTimestamp + durationMs;

    // Check if item intersects with viewport
    const viewport = engine.getViewportState();
    const isVisible = itemEndTimestamp >= viewport.start && startTimestamp <= viewport.end;

    const position = engine.timeToPixel(startTimestamp);
    const itemWidth = engine.durationToPixels(durationMs);

    return {
      left: position,
      width: itemWidth,
      isVisible
    };
  }, [engine, timeConverter, startTime, duration, endTime, refreshCounter]);

  const top = useMemo(() => {
    const rowHeightPx = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    return row * rowHeightPx;
  }, [row]);

  // Don't render if item is outside viewport
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        zIndex: 10,
        pointerEvents: 'auto',
        ...style,
        // Allow style.height to override if provided
        height: style?.height || 'var(--timeline-row-height)'
      }}
      data-timeline-item
      data-row={row}
      data-width={width}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Clone child and add inline style to remove padding when width <= 20
          return React.cloneElement(child as React.ReactElement<any>, {
            style: {
              ...child.props.style,
              ...(width <= 20 && { paddingLeft: 0, paddingRight: 0 })
            }
          });
        }
        return child;
      })}
    </div>
  );
};
