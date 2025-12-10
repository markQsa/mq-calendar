import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { TimelineRowProps, AvailabilityConfig } from '../types';
import type { TimelineItemData } from '../../utils/aggregationUtils';
import { aggregateItemsByPeriod, getGranularity, shouldUseAggregatedView } from '../../utils/aggregationUtils';
import { AggregatedView } from './AggregatedView';
import { useTimelineContext } from './TimelineContext';
import { detectOverlapsAndAssignSubRows, type TimeRangeItem } from '../../utils/overlapDetection';

interface TimelineRowState {
  id: string;
  isExpanded: boolean;
  rowCount: number;
  rowHeight: number; // Height in pixels for each row
  order: number;
  collapsible: boolean;
}

interface TimelineRowGroupContextValue {
  getRowState: (id: string) => TimelineRowState | undefined;
  getCalculatedPosition: (id: string) => number;
  getRowAtAbsolutePosition: (absoluteRow: number) => { rowId: string; relativeRow: number } | null;
  getRowAtPixelY: (pixelY: number) => { rowId: string; relativeRow: number; isInHeader: boolean; offsetInRow: number } | null;
  getTotalHeight: () => number;
  toggleRow: (id: string) => void;
  registerRow: (id: string, rowCount: number, rowHeight: number, defaultExpanded: boolean, collapsible: boolean) => void;
  unregisterRow: (id: string) => void;
  version: number;
  rowsSize: number;
}

const TimelineRowGroupContext = createContext<TimelineRowGroupContextValue | undefined>(undefined);

export const useTimelineRowGroup = () => {
  const context = useContext(TimelineRowGroupContext);
  return context;
};

interface TimelineRowGroupProps {
  children: React.ReactNode;
}

/**
 * Group container for TimelineRow components
 * Manages the collapsed/expanded state and automatic positioning
 */
export const TimelineRowGroup: React.FC<TimelineRowGroupProps> = ({ children }) => {
  const [rows, setRows] = useState<Map<string, TimelineRowState>>(new Map());
  const orderCounterRef = useRef(0);
  const [version, setVersion] = useState(0);

  const registerRow = useCallback((id: string, rowCount: number, rowHeight: number, defaultExpanded: boolean, collapsible: boolean) => {
    setRows(prev => {
      if (prev.has(id)) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set(id, { id, rowCount, rowHeight, isExpanded: defaultExpanded, order: orderCounterRef.current, collapsible });
      orderCounterRef.current += 1;
      return newMap;
    });
  }, []);

  const unregisterRow = useCallback((id: string) => {
    setRows(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const toggleRow = useCallback((id: string) => {
    setRows(prev => {
      const newMap = new Map(prev);
      const row = newMap.get(id);
      if (row && row.collapsible) {
        newMap.set(id, { ...row, isExpanded: !row.isExpanded });
      }
      return newMap;
    });
    setVersion(v => v + 1);
  }, []);

  const getRowState = useCallback((id: string): TimelineRowState | undefined => {
    return rows.get(id);
  }, [rows]);

  const getCalculatedPosition = useCallback((id: string): number => {
    const headerHeight = 40;
    const defaultHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');

    let cumulativeHeight = 0; // Track in pixels
    const rowArray = Array.from(rows.values()).sort((a, b) => a.order - b.order);

    for (const row of rowArray) {
      if (row.id === id) {
        break;
      }

      // Each row takes: header height (if collapsible) + (content height if expanded)
      if (row.collapsible) {
        cumulativeHeight += headerHeight;
      }
      if (row.isExpanded) {
        cumulativeHeight += row.rowCount * row.rowHeight;
      }
    }

    // Return position in "row units" relative to default height for backward compatibility
    return cumulativeHeight / defaultHeight;
  }, [rows]);

  const getRowAtAbsolutePosition = useCallback((absoluteRow: number): { rowId: string; relativeRow: number } | null => {
    const rowHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    const headerHeight = 40;
    const headerRows = headerHeight / rowHeight;

    let currentPosition = 0;
    const rowArray = Array.from(rows.values()).sort((a, b) => a.order - b.order);

    for (const row of rowArray) {
      if (!row.isExpanded) {
        // Collapsed row - only has header
        const rowHeaderRows = row.collapsible ? headerRows : 0;
        currentPosition += rowHeaderRows;
        continue;
      }

      const rowHeaderRows = row.collapsible ? headerRows : 0;
      const rowStart = currentPosition + rowHeaderRows; // Start of content area
      const rowEnd = rowStart + row.rowCount; // End of content area

      // Check if absolute position is within this row's content area
      if (absoluteRow >= rowStart && absoluteRow < rowEnd) {
        const relativeRow = absoluteRow - rowStart;
        return { rowId: row.id, relativeRow };
      }

      currentPosition = rowEnd;
    }

    return null;
  }, [rows]);

  const getTotalHeight = useCallback((): number => {
    const headerHeight = 40;
    let totalHeight = 0; // Track in pixels

    const rowArray = Array.from(rows.values()).sort((a, b) => a.order - b.order);

    for (const row of rowArray) {
      if (row.collapsible) {
        totalHeight += headerHeight;
      }
      if (row.isExpanded) {
        totalHeight += row.rowCount * row.rowHeight;
      }
    }

    return Math.max(totalHeight, 200); // At least 200px
  }, [rows]);

  // Convert pixel Y position to row info (for drag operations with midpoint threshold)
  const getRowAtPixelY = useCallback((pixelY: number): {
    rowId: string;
    relativeRow: number;
    isInHeader: boolean;
    offsetInRow: number;
  } | null => {
    const headerHeight = 40;
    let currentY = 0;
    const rowArray = Array.from(rows.values()).sort((a, b) => a.order - b.order);

    for (const row of rowArray) {
      if (!row.isExpanded) {
        // Collapsed row - only has header
        if (row.collapsible) {
          const headerEnd = currentY + headerHeight;
          if (pixelY >= currentY && pixelY < headerEnd) {
            return {
              rowId: row.id,
              relativeRow: 0,
              isInHeader: true,
              offsetInRow: pixelY - currentY
            };
          }
          currentY = headerEnd;
        }
        continue;
      }

      // Check header (if collapsible)
      if (row.collapsible) {
        const headerEnd = currentY + headerHeight;
        if (pixelY >= currentY && pixelY < headerEnd) {
          return {
            rowId: row.id,
            relativeRow: 0,
            isInHeader: true,
            offsetInRow: pixelY - currentY
          };
        }
        currentY = headerEnd;
      }

      // Check content area
      const contentEnd = currentY + (row.rowCount * row.rowHeight);
      if (pixelY >= currentY && pixelY < contentEnd) {
        const offsetInContent = pixelY - currentY;
        const relativeRow = Math.floor(offsetInContent / row.rowHeight);
        const offsetInRow = offsetInContent % row.rowHeight;

        return {
          rowId: row.id,
          relativeRow,
          isInHeader: false,
          offsetInRow
        };
      }

      currentY = contentEnd;
    }

    return null;
  }, [rows]);

  const contextValue = useMemo(
    () => ({
      getRowState,
      getCalculatedPosition,
      getRowAtAbsolutePosition,
      getRowAtPixelY,
      getTotalHeight,
      toggleRow,
      registerRow,
      unregisterRow,
      version,
      rowsSize: rows.size
    }),
    [getRowState, getCalculatedPosition, getRowAtAbsolutePosition, getRowAtPixelY, getTotalHeight, toggleRow, registerRow, unregisterRow, version, rows.size]
  );

  return (
    <TimelineRowGroupContext.Provider value={contextValue}>
      {children}
    </TimelineRowGroupContext.Provider>
  );
};

interface DraggedItemInfo {
  itemId: string | number;
  startTime: number;
  endTime: number;
  row: number;
}

interface TimelineRowContextValue {
  id: string;
  startRow: number;
  rowCount: number;
  rowHeight: number;
  isExpanded: boolean;
  collapsible: boolean;
  // Drag tracking
  registerDraggedItem: (itemId: string | number, startTime: number, endTime: number, row: number) => void;
  unregisterDraggedItem: (itemId: string | number) => void;
  // Get current subRow assignment for an item (for dynamic overlap during drag)
  getSubRowAssignment: (itemId: string | number) => { subRow: number; subRowCount: number } | undefined;
  // Version counter that changes when subRow assignments change (triggers re-render)
  subRowAssignmentsVersion: number;
}

const TimelineRowContext = createContext<TimelineRowContextValue | undefined>(undefined);

export const useTimelineRowContext = () => {
  const context = useContext(TimelineRowContext);
  return context;
};

/**
 * TimelineRow component - can be simple or collapsible
 * When collapsible=true, shows a header and can be expanded/collapsed
 * When collapsible=false, acts as a simple container
 * Must be used within TimelineRowGroup for automatic positioning
 */
export const TimelineRow: React.FC<TimelineRowProps> = ({
  id,
  label,
  rowCount = 1,
  height,
  startRow,
  collapsible = false,
  showHeader = true,
  defaultExpanded = true,
  className,
  style,
  headerClassName,
  headerStyle,
  renderHeader,
  aggregation,
  renderAggregatedPeriod,
  getAggregatedTypeStyle,
  items,
  renderItem,
  children
}) => {
  const groupContext = useTimelineRowGroup();
  const { engine, timeConverter, refreshCounter } = useTimelineContext();

  // Generate ID if not provided
  const rowId = id || `row-${Math.random().toString(36).substr(2, 9)}`;

  // Track dragged items for dynamic overlap detection
  const [draggedItems, setDraggedItems] = useState<Map<string | number, DraggedItemInfo>>(new Map());
  const [dragVersion, setDragVersion] = useState(0);

  const registerDraggedItem = useCallback((itemId: string | number, startTime: number, endTime: number, row: number) => {
    setDraggedItems(prev => {
      const newMap = new Map(prev);
      newMap.set(itemId, { itemId, startTime, endTime, row });
      return newMap;
    });
    setDragVersion(v => v + 1); // Increment on every drag update
  }, []);

  const unregisterDraggedItem = useCallback((itemId: string | number) => {
    setDraggedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  }, []);

  // Compute effective height
  const effectiveHeight = useMemo(() => {
    if (height !== undefined) return height;
    return parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
  }, [height]);

  const headerHeight = 40;

  // Extract context values to use as stable dependencies
  const version = groupContext?.version;
  const rowsSize = groupContext?.rowsSize;
  const getCalculatedPositionFn = groupContext?.getCalculatedPosition;

  // If within a group context, use dynamic positioning
  const calculatedStartRow = useMemo(() => {
    if (!getCalculatedPositionFn) {
      // Not in a group, use provided startRow or default to 0
      return startRow ?? 0;
    }

    // In a group, calculate position automatically
    return getCalculatedPositionFn(rowId);
  }, [getCalculatedPositionFn, rowId, startRow, version, rowsSize]);

  // Extract registerRow and unregisterRow to use as dependencies
  const registerRowFn = groupContext?.registerRow;
  const unregisterRowFn = groupContext?.unregisterRow;
  const getRowStateFn = groupContext?.getRowState;
  const toggleRowFn = groupContext?.toggleRow;

  // Register with group if in a group context
  useEffect(() => {
    if (registerRowFn && unregisterRowFn) {
      registerRowFn(rowId, rowCount, effectiveHeight, defaultExpanded, collapsible);
      return () => unregisterRowFn(rowId);
    }
  }, [registerRowFn, unregisterRowFn, rowId, rowCount, effectiveHeight, defaultExpanded, collapsible]);

  const rowState = getRowStateFn?.(rowId);
  const isExpanded = rowState?.isExpanded ?? defaultExpanded;

  // Convert position from "row units" to actual pixels using default height
  const top = useMemo(() => {
    const defaultHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    return calculatedStartRow * defaultHeight;
  }, [calculatedStartRow]);

  const contentTop = useMemo(() => {
    return top + (collapsible && showHeader ? headerHeight : 0);
  }, [top, headerHeight, collapsible, showHeader]);

  const contentHeight = useMemo(() => {
    return isExpanded ? (rowCount * effectiveHeight) : 0;
  }, [isExpanded, rowCount, effectiveHeight]);

  const handleToggle = useCallback(() => {
    if (collapsible && toggleRowFn) {
      toggleRowFn(rowId);
    }
  }, [rowId, collapsible, toggleRowFn]);

  // Aggregation logic
  const useAggregation = useMemo(() => {
    if (!engine || !timeConverter || !aggregation || aggregation.enabled === false) {
      return false;
    }

    const viewport = engine.getViewportState();
    const viewportDuration = viewport.end - viewport.start;

    // Get threshold duration
    const threshold = aggregation.threshold || '6 months';
    const thresholdMs = timeConverter.parseDuration ? timeConverter.parseDuration(threshold) : 0;

    // Count items (prefer items prop over children)
    const itemCount = items && items.length > 0 ? items.length : React.Children.count(children);
    const minItems = aggregation.minItemsForAggregation ?? 50;

    return shouldUseAggregatedView(viewportDuration, thresholdMs, itemCount, minItems);
  }, [engine, timeConverter, aggregation, children, items, refreshCounter]);

  // Extract and aggregate items if needed
  const aggregatedPeriods = useMemo(() => {
    if (!useAggregation || !engine || !timeConverter) {
      return null;
    }

    const viewport = engine.getViewportState();
    const itemsData: TimelineItemData[] = [];

    // Use items prop if provided, otherwise extract from children
    if (items && items.length > 0) {
      // Use items prop (more efficient)
      items.forEach((item) => {
        const startTime = timeConverter.toTimestamp(item.startTime);
        const duration = item.duration && timeConverter.parseDuration
          ? timeConverter.parseDuration(item.duration)
          : item.endTime
          ? timeConverter.toTimestamp(item.endTime) - startTime
          : 0;

        itemsData.push({
          startTime,
          endTime: startTime + duration,
          duration,
          type: item.type || 'default'
        });
      });
    } else {
      // Extract item data from children (fallback)
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.props.startTime) {
          const startTime = timeConverter.toTimestamp(child.props.startTime);
          const duration = child.props.duration && timeConverter.parseDuration
            ? timeConverter.parseDuration(child.props.duration)
            : child.props.endTime
            ? timeConverter.toTimestamp(child.props.endTime) - startTime
            : 0;

          itemsData.push({
            startTime,
            endTime: startTime + duration,
            duration,
            type: child.props.type || child.props.children?.props?.type || 'default'
          });
        }
      });
    }

    // Determine granularity
    const viewportDuration = viewport.end - viewport.start;
    const granularity = getGranularity(viewportDuration, aggregation?.granularity || 'dynamic');

    // Get availability config from somewhere (you may need to pass this through context)
    const availability: AvailabilityConfig | undefined = undefined; // TODO: Get from context

    return aggregateItemsByPeriod(itemsData, viewport.start, viewport.end, granularity, availability);
  }, [useAggregation, engine, timeConverter, children, items, aggregation, refreshCounter]);

  // Calculate sub-row assignments for overlapping items
  const subRowAssignments = useMemo(() => {
    if (!timeConverter || !engine) {
      return new Map();
    }

    // Group items by their row prop
    const itemsByRow = new Map<number, Array<{ id: string | number; timeRangeItem: TimeRangeItem }>>();

    // Process items from items prop if provided
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        const itemRow = typeof item.row === 'number' ? item.row : 0;

        // Calculate time range
        const startTime = timeConverter.toTimestamp(item.startTime);
        let duration = 0;

        if (item.endTime) {
          duration = timeConverter.toTimestamp(item.endTime) - startTime;
        } else if (item.duration && timeConverter.parseDuration) {
          duration = timeConverter.parseDuration(item.duration);
        }

        const endTime = startTime + duration;

        // Create a unique ID for this item
        const itemId = item.id || `item-${index}`;

        const timeRangeItem: TimeRangeItem = {
          id: itemId,
          startTime,
          endTime
        };

        if (!itemsByRow.has(itemRow)) {
          itemsByRow.set(itemRow, []);
        }
        itemsByRow.get(itemRow)!.push({ id: itemId, timeRangeItem });
      });
    } else {
      // Process items from children
      React.Children.forEach(children, (child, index) => {
        if (React.isValidElement(child) && child.props.startTime) {
          const itemRow = typeof child.props.row === 'number' ? child.props.row : 0;

          // Calculate time range
          const startTime = timeConverter.toTimestamp(child.props.startTime);
          let duration = 0;

          if (child.props.endTime) {
            duration = timeConverter.toTimestamp(child.props.endTime) - startTime;
          } else if (child.props.duration && timeConverter.parseDuration) {
            duration = timeConverter.parseDuration(child.props.duration);
          }

          const endTime = startTime + duration;

          // Create a unique ID for this item (check id prop, key, or use index as fallback)
          const itemId = child.props.id || child.key || `item-${index}`;

          const timeRangeItem: TimeRangeItem = {
            id: itemId,
            startTime,
            endTime
          };

          if (!itemsByRow.has(itemRow)) {
            itemsByRow.set(itemRow, []);
          }
          itemsByRow.get(itemRow)!.push({ id: itemId, timeRangeItem });
        }
      });
    }

    // Merge dragged items into the calculation
    // This allows dynamic overlap detection while dragging
    for (const draggedItem of draggedItems.values()) {
      const itemRow = draggedItem.row;

      // Update or add the dragged item with its current position
      const existingItems = itemsByRow.get(itemRow) || [];
      const existingIndex = existingItems.findIndex(item => item.id === draggedItem.itemId);

      const timeRangeItem: TimeRangeItem = {
        id: draggedItem.itemId,
        startTime: draggedItem.startTime,
        endTime: draggedItem.endTime
      };

      // Create new array to ensure React detects the change
      const updatedItems = [...existingItems];

      if (existingIndex >= 0) {
        // Update existing item with dragged position
        updatedItems[existingIndex] = { id: draggedItem.itemId, timeRangeItem };
      } else {
        // Add new dragged item
        updatedItems.push({ id: draggedItem.itemId, timeRangeItem });
      }

      itemsByRow.set(itemRow, updatedItems);
    }

    // Detect overlaps for each row
    const assignments = new Map<string | number, { subRow: number; subRowCount: number }>();

    for (const [, rowItems] of itemsByRow) {
      const timeRangeItems = rowItems.map(item => item.timeRangeItem);
      const rowAssignments = detectOverlapsAndAssignSubRows(timeRangeItems);

      // Merge into main assignments map
      for (const [id, assignment] of rowAssignments) {
        assignments.set(id, {
          subRow: assignment.subRow,
          subRowCount: assignment.subRowCount
        });
      }
    }

    return assignments;
  }, [children, items, timeConverter, engine, refreshCounter, draggedItems]);

  const getSubRowAssignment = useCallback((itemId: string | number) => {
    return subRowAssignments.get(itemId);
  }, [subRowAssignments]);

  // Version counter for subRow assignments - increments when assignments change
  const subRowAssignmentsVersion = useMemo(() => {
    return dragVersion + subRowAssignments.size;
  }, [dragVersion, subRowAssignments]);

  const contextValue = useMemo(
    () => ({
      id: rowId,
      startRow: calculatedStartRow,
      rowCount,
      rowHeight: effectiveHeight,
      isExpanded,
      collapsible,
      registerDraggedItem,
      unregisterDraggedItem,
      getSubRowAssignment,
      subRowAssignmentsVersion
    }),
    [rowId, calculatedStartRow, rowCount, effectiveHeight, isExpanded, collapsible, registerDraggedItem, unregisterDraggedItem, getSubRowAssignment, subRowAssignmentsVersion]
  );

  // Default header renderer
  const defaultHeaderContent = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      {collapsible && (
        <span style={{ fontSize: '12px' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      )}
      <span>{label}</span>
    </div>
  );

  return (
    <TimelineRowContext.Provider value={contextValue}>
      {/* Header - only show if collapsible and showHeader is true */}
      {collapsible && showHeader && (
        <div
          className={headerClassName}
          style={{
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height: headerHeight,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid var(--timeline-header-border, #d1d5db)',
            background: 'var(--timeline-header-bg, #ffffff)',
            color: 'var(--timeline-header-text, #374151)',
            ...headerStyle
          }}
          onClick={handleToggle}
          data-timeline-row-header
          data-row-id={rowId}
        >
          {renderHeader ? renderHeader({ isExpanded, label: label || '', toggle: handleToggle }) : defaultHeaderContent}
        </div>
      )}

      {/* Content area */}
      {isExpanded && (
        <>
          {/* Background for content - always render for collapsible rows to show bottom border */}
          {collapsible && (
            <div
              className={className}
              style={{
                position: 'absolute',
                top: contentTop,
                left: 0,
                right: 0,
                height: contentHeight,
                zIndex: 1,
                pointerEvents: 'none',
                borderBottom: '1px solid var(--timeline-header-border, #d1d5db)',
                ...style
              }}
              data-timeline-row-content
              data-row-id={rowId}
            />
          )}
          {/* Background for non-collapsible rows - only if has style/className */}
          {!collapsible && (className || style) && (
            <div
              className={className}
              style={{
                position: 'absolute',
                top: contentTop,
                left: 0,
                right: 0,
                height: contentHeight,
                zIndex: 1,
                pointerEvents: 'none',
                ...style
              }}
              data-timeline-row-content
              data-row-id={rowId}
            />
          )}

          {/* Render aggregated view or individual children */}
          {useAggregation && aggregatedPeriods ? (
            <AggregatedView
              periods={aggregatedPeriods}
              row={calculatedStartRow + ((collapsible && showHeader) ? headerHeight / parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-row-height') || '60') : 0)}
              rowHeight={effectiveHeight}
              getTypeStyle={getAggregatedTypeStyle}
              renderPeriod={renderAggregatedPeriod}
            />
          ) : items && renderItem && engine && timeConverter ? (
            /* Optimized rendering: Filter items BEFORE creating components */
            (() => {
              const viewport = engine.getViewportState();
              // Track original indices while filtering
              const visibleItemsWithIndices = items
                .map((item, originalIndex) => ({ item, originalIndex }))
                .filter(({ item }) => {
                  const startTimestamp = timeConverter.toTimestamp(item.startTime);
                  let endTimestamp: number;

                  if (item.endTime) {
                    endTimestamp = timeConverter.toTimestamp(item.endTime);
                  } else if (item.duration && timeConverter.parseDuration) {
                    const durationMs = timeConverter.parseDuration(item.duration);
                    endTimestamp = startTimestamp + durationMs;
                  } else {
                    endTimestamp = startTimestamp;
                  }

                  return endTimestamp >= viewport.start && startTimestamp <= viewport.end;
                });

              return visibleItemsWithIndices.map(({ item, originalIndex }) => {
                const element = renderItem(item, originalIndex);

                // Calculate stable ID (must match ID used in overlap detection)
                const itemId = item.id || `item-${originalIndex}`;

                // Don't pass subRow/subRowCount via props - let TimelineItem read from context
                // But DO pass id to ensure consistency between TimelineRow and TimelineItem
                if (React.isValidElement<any>(element)) {
                  return React.cloneElement(element as React.ReactElement<any>, {
                    id: itemId,
                    style: {
                      ...element.props.style,
                      marginTop: '4px',
                      marginBottom: '4px'
                    }
                  });
                }

                return element;
              });
            })()
          ) : (
            /* Children - filter by viewport first for performance, then offset row props */
            React.Children.map(children, (child, _index) => {
              // Performance optimization: Filter TimelineItems by viewport before rendering
              if (React.isValidElement<any>(child) &&
                  child.props?.startTime &&
                  engine &&
                  timeConverter) {
                const viewport = engine.getViewportState();
                const startTimestamp = timeConverter.toTimestamp(child.props.startTime);

                // Calculate end time
                let endTimestamp: number;
                if (child.props.endTime) {
                  endTimestamp = timeConverter.toTimestamp(child.props.endTime);
                } else if (child.props.duration && timeConverter.parseDuration) {
                  const durationMs = timeConverter.parseDuration(child.props.duration);
                  endTimestamp = startTimestamp + durationMs;
                } else {
                  endTimestamp = startTimestamp;
                }

                // Skip items outside viewport
                if (endTimestamp < viewport.start || startTimestamp > viewport.end) {
                  return null;
                }
              }


              if (React.isValidElement<any>(child) && typeof child.props?.row === 'number') {
                // Calculate stable ID for this child (must match ID used in overlap detection)
                const itemId = child.props.id || child.key || `item-${_index}`;

                // Don't pass subRow/subRowCount via props - let TimelineItem read from context
                // But DO pass id to ensure consistency between TimelineRow and TimelineItem
                return React.cloneElement(child as React.ReactElement<any>, {
                  id: itemId,
                  style: {
                    ...child.props.style,
                    marginTop: '4px',
                    marginBottom: '4px'
                  }
                });
              }
              return child;
            })
          )}
        </>
      )}
    </TimelineRowContext.Provider>
  );
};
