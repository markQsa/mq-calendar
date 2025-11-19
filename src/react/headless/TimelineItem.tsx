import React, { useMemo, useRef, useState } from 'react';
import type { TimelineItemProps } from '../types';
import { useTimelineContext } from './TimelineContext';
import { useTimelineRowContext } from './TimelineRow';

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
  subRow,
  subRowCount,
  draggable = false,
  allowRowChange = false,
  onDragStart,
  onDrag,
  onRowChange,
  onDragEnd,
  className,
  style,
  children
}) => {
  const { engine, timeConverter, refreshCounter } = useTimelineContext();
  const rowContext = useTimelineRowContext();
  // const rowGroupContext = useTimelineRowGroup(); // For future cross-TimelineRow dragging

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTimestamp, setDraggedTimestamp] = useState<number | null>(null);
  const [draggedRow, setDraggedRow] = useState<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; startTimestamp: number; startRow: number; rowOffset: number; rowGroupId: string | undefined } | null>(null);
  const currentDraggedTimestamp = useRef<number | null>(null);
  const currentDraggedRow = useRef<number | null>(null);
  const currentDraggedRowGroupId = useRef<string | undefined>(undefined);
  const dragMode = useRef<'horizontal' | 'vertical' | null>(null);

  // Helper to convert absolute row to relative row within container
  const absoluteToRelativeRow = (absoluteRow: number): number => {
    if (!rowContext) return absoluteRow;
    const rowHeightPx = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    const headerHeight = 40;
    const headerRows = (rowContext.collapsible) ? headerHeight / rowHeightPx : 0;
    const containerStartRow = rowContext.startRow + headerRows;
    return absoluteRow - containerStartRow;
  };

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

    // Use dragged row while dragging vertically, otherwise use the prop
    const effectiveRow = isDragging && draggedRow !== null ? draggedRow : row;
    const baseTop = effectiveRow * rowHeightPx;

    // If item is in a sub-row due to overlapping, adjust position
    if (subRow !== undefined && subRowCount !== undefined && subRowCount > 1) {
      const subRowHeight = rowHeightPx / subRowCount;
      return baseTop + (subRow * subRowHeight);
    }

    return baseTop;
  }, [row, subRow, subRowCount, isDragging, draggedRow]);

  const height = useMemo(() => {
    const rowHeightPx = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');

    // Calculate height based on sub-row count
    if (subRowCount !== undefined && subRowCount > 1) {
      const subRowHeight = rowHeightPx / subRowCount;
      // Account for margins (4px top + 4px bottom = 8px total)
      return `${subRowHeight - 8}px`;
    }

    // Default height with margins
    return 'calc(var(--timeline-row-height) - 8px)';
  }, [subRowCount]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable || !engine) return;

    e.preventDefault();
    const startTimestamp = timeConverter.toTimestamp(startTime);

    // Calculate row offset within the TimelineRow container
    // The row prop we receive is already the absolute row position
    // We need to calculate the relative row within the container
    let rowOffset = row;
    if (rowContext) {
      // Account for header rows if present
      const rowHeightPx = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--timeline-row-height') || '60');
      const headerHeight = 40;
      const headerRows = (rowContext.collapsible) ? headerHeight / rowHeightPx : 0;
      const containerStartRow = rowContext.startRow + headerRows;
      rowOffset = row - containerStartRow;
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startTimestamp,
      startRow: row,
      rowOffset,
      rowGroupId: rowContext?.id
    };

    let dragStarted = false;
    const DRAG_THRESHOLD = 5; // pixels

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      const deltaY = moveEvent.clientY - dragStartRef.current.y;

      // Only start dragging after threshold is exceeded
      if (!dragStarted && Math.abs(deltaX) < DRAG_THRESHOLD && Math.abs(deltaY) < DRAG_THRESHOLD) {
        return;
      }

      if (!dragStarted) {
        dragStarted = true;

        // Determine drag mode based on initial movement direction
        if (allowRowChange && Math.abs(deltaY) > Math.abs(deltaX)) {
          // Vertical drag (row change)
          dragMode.current = 'vertical';
        } else {
          // Horizontal drag (time change)
          dragMode.current = 'horizontal';
        }

        setIsDragging(true);
        setDraggedTimestamp(startTimestamp);
        setDraggedRow(row);
        currentDraggedTimestamp.current = startTimestamp;
        currentDraggedRow.current = row;
        currentDraggedRowGroupId.current = rowContext?.id;
        onDragStart?.(startTimestamp, absoluteToRelativeRow(row), rowContext?.id);
      }

      // Handle dragging based on mode
      if (dragMode.current === 'horizontal') {
        // Horizontal drag - change time only
        const pixelsPerMs = engine.getZoomState().pixelsPerMs;
        const deltaTimeMs = deltaX / pixelsPerMs;
        const rawTimestamp = dragStartRef.current.startTimestamp + deltaTimeMs;
        const snappedTimestamp = snapToInterval(rawTimestamp);

        currentDraggedTimestamp.current = snappedTimestamp;
        setDraggedTimestamp(snappedTimestamp);
        onDrag?.(snappedTimestamp, absoluteToRelativeRow(currentDraggedRow.current!), currentDraggedRowGroupId.current);
      } else if (dragMode.current === 'vertical') {
        // Vertical drag - change row only
        const rowHeightPx = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--timeline-row-height') || '60');
        const deltaRows = Math.round(deltaY / rowHeightPx);

        // For now, constrain dragging within the same TimelineRow
        // Cross-TimelineRow dragging requires architectural changes (portals/re-parenting)
        if (rowContext) {
          // Constrain within current TimelineRow
          let newRowOffset = dragStartRef.current.rowOffset + deltaRows;
          const maxRowOffset = rowContext.rowCount - 1;
          newRowOffset = Math.max(0, Math.min(newRowOffset, maxRowOffset));

          const headerHeight = 40;
          const headerRows = (rowContext.collapsible) ? headerHeight / rowHeightPx : 0;
          const containerStartRow = rowContext.startRow + headerRows;
          const newRow = containerStartRow + newRowOffset;

          if (newRow !== currentDraggedRow.current) {
            const oldRow = currentDraggedRow.current!;
            currentDraggedRow.current = newRow;
            setDraggedRow(newRow);
            onRowChange?.(absoluteToRelativeRow(newRow), absoluteToRelativeRow(oldRow), rowContext.id, rowContext.id);
          }

          onDrag?.(currentDraggedTimestamp.current!, absoluteToRelativeRow(newRow), rowContext.id);
        } else {
          // No container at all
          const newRowOffset = Math.max(0, dragStartRef.current.rowOffset + deltaRows);

          if (newRowOffset !== currentDraggedRow.current) {
            const oldRow = currentDraggedRow.current!;
            currentDraggedRow.current = newRowOffset;
            setDraggedRow(newRowOffset);
            onRowChange?.(newRowOffset, oldRow);
          }

          onDrag?.(currentDraggedTimestamp.current!, newRowOffset);
        }
      }
    };

    const handleMouseUp = () => {
      if (!dragStartRef.current) return;

      // Only call onDragEnd if drag actually started (moved beyond threshold)
      if (dragStarted && currentDraggedTimestamp.current !== null && currentDraggedRow.current !== null) {
        const originalTimestamp = dragStartRef.current.startTimestamp;
        const originalRow = dragStartRef.current.startRow;
        const originalRowGroupId = dragStartRef.current.rowGroupId;
        const finalTimestamp = currentDraggedTimestamp.current;
        const finalRow = currentDraggedRow.current;
        const finalRowGroupId = currentDraggedRowGroupId.current;

        setIsDragging(false);
        setDraggedTimestamp(null);
        setDraggedRow(null);
        currentDraggedTimestamp.current = null;
        currentDraggedRow.current = null;
        currentDraggedRowGroupId.current = undefined;
        dragMode.current = null;

        onDragEnd?.(finalTimestamp, originalTimestamp, absoluteToRelativeRow(finalRow), absoluteToRelativeRow(originalRow), finalRowGroupId, originalRowGroupId);
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
          // Allow style.height to override if provided, otherwise use calculated height
          height: style?.height || height
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
