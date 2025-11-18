import React, { useMemo, useRef, useState } from 'react';
import type { TimelineItemProps } from '../types';
import { useTimelineContext } from './TimelineContext';

/**
 * Snap timestamp to nearest interval (default: 15 minutes)
 */
const snapToInterval = (timestamp: number, intervalMs: number = 15 * 60 * 1000): number => {
  return Math.round(timestamp / intervalMs) * intervalMs;
};

/**
 * Item component for positioning content at specific times
 */
export const TimelineItem: React.FC<TimelineItemProps> = ({
  startTime,
  duration,
  endTime,
  row = 0,
  draggable = false,
  onDragStart,
  onDrag,
  onDragEnd,
  className,
  style,
  children
}) => {
  const { engine, timeConverter, refreshCounter } = useTimelineContext();

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTimestamp, setDraggedTimestamp] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; startTimestamp: number } | null>(null);
  const currentDraggedTimestamp = useRef<number | null>(null);

  // Calculate position, width, and visibility
  const { left, width, isVisible } = useMemo(() => {
    if (!engine) return { left: 0, width: 0, isVisible: false };

    // Use dragged timestamp while dragging, otherwise use the prop
    const effectiveTimestamp = isDragging && draggedTimestamp !== null
      ? draggedTimestamp
      : timeConverter.toTimestamp(startTime);

    const startTimestamp = effectiveTimestamp;

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
  }, [engine, timeConverter, startTime, duration, endTime, refreshCounter, isDragging, draggedTimestamp]);

  const top = useMemo(() => {
    const rowHeightPx = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    return row * rowHeightPx;
  }, [row]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable || !engine) return;

    e.preventDefault();
    const startTimestamp = timeConverter.toTimestamp(startTime);

    dragStartRef.current = {
      x: e.clientX,
      startTimestamp
    };

    let dragStarted = false;
    const DRAG_THRESHOLD = 5; // pixels

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = moveEvent.clientX - dragStartRef.current.x;

      // Only start dragging after threshold is exceeded
      if (!dragStarted && Math.abs(deltaX) < DRAG_THRESHOLD) {
        return;
      }

      if (!dragStarted) {
        dragStarted = true;
        setIsDragging(true);
        setDraggedTimestamp(startTimestamp);
        currentDraggedTimestamp.current = startTimestamp;
        onDragStart?.(startTimestamp);
      }

      const pixelsPerMs = engine.getZoomState().pixelsPerMs;
      const deltaTimeMs = deltaX / pixelsPerMs;
      const rawTimestamp = dragStartRef.current.startTimestamp + deltaTimeMs;
      const snappedTimestamp = snapToInterval(rawTimestamp);

      currentDraggedTimestamp.current = snappedTimestamp;
      setDraggedTimestamp(snappedTimestamp);
      onDrag?.(snappedTimestamp);
    };

    const handleMouseUp = () => {
      if (!dragStartRef.current) return;

      // Only call onDragEnd if drag actually started (moved beyond threshold)
      if (dragStarted && currentDraggedTimestamp.current !== null) {
        const originalTimestamp = dragStartRef.current.startTimestamp;
        const finalTimestamp = currentDraggedTimestamp.current;

        setIsDragging(false);
        setDraggedTimestamp(null);
        currentDraggedTimestamp.current = null;

        onDragEnd?.(finalTimestamp, originalTimestamp);
      }

      dragStartRef.current = null;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Don't render if item is outside viewport
  if (!isVisible) {
    return null;
  }

  // Format the dragged timestamp for display
  const draggedDate = isDragging && draggedTimestamp !== null
    ? new Date(draggedTimestamp)
    : null;

  return (
    <>
      <div
        className={className}
        style={{
          position: 'absolute',
          left,
          top,
          width,
          zIndex: isDragging ? 1000 : 10,
          pointerEvents: 'auto',
          cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
          opacity: isDragging ? 0.8 : 1,
          ...style,
          // Allow style.height to override if provided
          height: style?.height || 'var(--timeline-row-height)'
        }}
        data-timeline-item
        data-row={row}
        data-width={width}
        onMouseDown={handleMouseDown}
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

      {/* Drag tooltip */}
      {isDragging && draggedDate && (
        <div
          style={{
            position: 'absolute',
            left,
            top: top - 35,
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {draggedDate.toLocaleString()}
        </div>
      )}
    </>
  );
};
