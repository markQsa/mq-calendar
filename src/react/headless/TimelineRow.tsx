import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { TimelineRowProps } from '../types';

interface TimelineRowState {
  id: string;
  isExpanded: boolean;
  rowCount: number;
  order: number;
  collapsible: boolean;
}

interface TimelineRowGroupContextValue {
  getRowState: (id: string) => TimelineRowState | undefined;
  getCalculatedPosition: (id: string) => number;
  toggleRow: (id: string) => void;
  registerRow: (id: string, rowCount: number, defaultExpanded: boolean, collapsible: boolean) => void;
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

  const registerRow = useCallback((id: string, rowCount: number, defaultExpanded: boolean, collapsible: boolean) => {
    setRows(prev => {
      if (prev.has(id)) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set(id, { id, rowCount, isExpanded: defaultExpanded, order: orderCounterRef.current, collapsible });
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
    const rowHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    const headerHeight = 40;
    const headerRows = headerHeight / rowHeight;

    let position = 0;
    const rowArray = Array.from(rows.values()).sort((a, b) => a.order - b.order);

    for (const row of rowArray) {
      if (row.id === id) {
        break;
      }

      // Each row takes: header height (if collapsible) + (content height if expanded)
      const rowHeaderRows = row.collapsible ? headerRows : 0;
      const contentRows = row.isExpanded ? row.rowCount : 0;
      position += rowHeaderRows + contentRows;
    }

    return position;
  }, [rows]);

  const contextValue = useMemo(
    () => ({
      getRowState,
      getCalculatedPosition,
      toggleRow,
      registerRow,
      unregisterRow,
      version,
      rowsSize: rows.size
    }),
    [getRowState, getCalculatedPosition, toggleRow, registerRow, unregisterRow, version, rows.size]
  );

  return (
    <TimelineRowGroupContext.Provider value={contextValue}>
      {children}
    </TimelineRowGroupContext.Provider>
  );
};

interface TimelineRowContextValue {
  startRow: number;
  rowCount: number;
  isExpanded: boolean;
  collapsible: boolean;
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
  startRow,
  collapsible = false,
  showHeader = true,
  defaultExpanded = true,
  className,
  style,
  headerClassName,
  headerStyle,
  renderHeader,
  children
}) => {
  const groupContext = useTimelineRowGroup();

  // Generate ID if not provided
  const rowId = id || `row-${Math.random().toString(36).substr(2, 9)}`;

  const rowHeight = useMemo(() => {
    return parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
  }, []);

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
      registerRowFn(rowId, rowCount, defaultExpanded, collapsible);
      return () => unregisterRowFn(rowId);
    }
  }, [registerRowFn, unregisterRowFn, rowId, rowCount, defaultExpanded, collapsible]);

  const rowState = getRowStateFn?.(rowId);
  const isExpanded = rowState?.isExpanded ?? defaultExpanded;

  const top = useMemo(() => {
    return calculatedStartRow * rowHeight;
  }, [calculatedStartRow, rowHeight]);

  const contentTop = useMemo(() => {
    return top + (collapsible && showHeader ? headerHeight : 0);
  }, [top, headerHeight, collapsible, showHeader]);

  const contentHeight = useMemo(() => {
    return isExpanded ? (rowCount * rowHeight) : 0;
  }, [isExpanded, rowCount, rowHeight]);

  const handleToggle = useCallback(() => {
    if (collapsible && toggleRowFn) {
      toggleRowFn(rowId);
    }
  }, [rowId, collapsible, toggleRowFn]);

  const contextValue = useMemo(
    () => ({
      startRow: calculatedStartRow,
      rowCount,
      isExpanded,
      collapsible
    }),
    [calculatedStartRow, rowCount, isExpanded, collapsible]
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

          {/* Children - offset their row prop by startRow and account for header */}
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && typeof child.props.row === 'number') {
              const headerRows = (collapsible && showHeader) ? headerHeight / rowHeight : 0;
              const absoluteRow = calculatedStartRow + headerRows + child.props.row;

              return React.cloneElement(child as React.ReactElement<any>, {
                row: absoluteRow,
                style: {
                  ...child.props.style,
                  marginTop: '4px',
                  marginBottom: '4px',
                  height: 'calc(var(--timeline-row-height) - 8px)'
                }
              });
            }
            return child;
          })}
        </>
      )}
    </TimelineRowContext.Provider>
  );
};
