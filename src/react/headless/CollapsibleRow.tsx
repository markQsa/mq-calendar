import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CollapsibleRowProps } from '../types';

interface CollapsibleRowState {
  id: string;
  isExpanded: boolean;
  rowCount: number;
  order: number; // Order in which rows were registered
}

interface CollapsibleRowGroupContextValue {
  getRowState: (id: string) => CollapsibleRowState | undefined;
  getCalculatedPosition: (id: string) => number;
  getTotalHeight: () => number; // Get total height of all collapsible rows
  toggleRow: (id: string) => void;
  registerRow: (id: string, rowCount: number, defaultExpanded: boolean) => void;
  unregisterRow: (id: string) => void;
  version: number; // Version counter to trigger re-renders
  rowsSize: number; // Number of rows to trigger re-renders on add/remove
}

const CollapsibleRowGroupContext = createContext<CollapsibleRowGroupContextValue | undefined>(undefined);

export const useCollapsibleRowGroup = () => {
  const context = useContext(CollapsibleRowGroupContext);
  return context; // Can be undefined if not within a CollapsibleRowGroup
};

interface CollapsibleRowGroupProps {
  children: React.ReactNode;
}

/**
 * Group container for CollapsibleRow components
 * Manages the collapsed/expanded state of multiple rows
 * Automatically calculates positions based on expanded/collapsed state
 */
export const CollapsibleRowGroup: React.FC<CollapsibleRowGroupProps> = ({ children }) => {
  const [rows, setRows] = useState<Map<string, CollapsibleRowState>>(new Map());
  const orderCounterRef = useRef(0); // Use ref instead of state for order counter
  const [version, setVersion] = useState(0); // Version counter for triggering re-renders

  const registerRow = useCallback((id: string, rowCount: number, defaultExpanded: boolean) => {
    setRows(prev => {
      // Only update if row doesn't exist
      if (prev.has(id)) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set(id, { id, rowCount, isExpanded: defaultExpanded, order: orderCounterRef.current });
      orderCounterRef.current += 1;
      return newMap;
    });
    // Don't increment version on registration - only on toggle
  }, []);

  const unregisterRow = useCallback((id: string) => {
    setRows(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    // Don't increment version on unregister - positions will adjust naturally
  }, []);

  const toggleRow = useCallback((id: string) => {
    setRows(prev => {
      const newMap = new Map(prev);
      const row = newMap.get(id);
      if (row) {
        newMap.set(id, { ...row, isExpanded: !row.isExpanded });
      }
      return newMap;
    });
    setVersion(v => v + 1); // Increment version when toggle happens
  }, []);

  const getRowState = useCallback((id: string): CollapsibleRowState | undefined => {
    return rows.get(id);
  }, [rows]);

  // Calculate position dynamically based on previous rows' heights
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

      // Each row takes: header height + (content height if expanded)
      const contentRows = row.isExpanded ? row.rowCount : 0;
      position += headerRows + contentRows;
    }

    return position;
  }, [rows]);

  // Get total height of all collapsible rows
  const getTotalHeight = useCallback((): number => {
    const rowHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    const headerHeight = 40;
    const headerRows = headerHeight / rowHeight;

    let totalRows = 0;
    const rowArray = Array.from(rows.values());

    for (const row of rowArray) {
      const contentRows = row.isExpanded ? row.rowCount : 0;
      totalRows += headerRows + contentRows;
    }

    return totalRows;
  }, [rows]);

  const contextValue = useMemo(
    () => ({
      getRowState,
      getCalculatedPosition,
      getTotalHeight,
      toggleRow,
      registerRow,
      unregisterRow,
      version,
      rowsSize: rows.size  // Add rows.size to force updates when rows are added/removed
    }),
    [getRowState, getCalculatedPosition, getTotalHeight, toggleRow, registerRow, unregisterRow, version, rows.size]
  );

  return (
    <CollapsibleRowGroupContext.Provider value={contextValue}>
      {children}
    </CollapsibleRowGroupContext.Provider>
  );
};

interface CollapsibleRowContextValue {
  startRow: number;
  rowCount: number;
  isExpanded: boolean;
}

const CollapsibleRowContext = createContext<CollapsibleRowContextValue | undefined>(undefined);

export const useCollapsibleRowContext = () => {
  const context = useContext(CollapsibleRowContext);
  return context; // Can be undefined if not within a CollapsibleRow
};

/**
 * CollapsibleRow component with expandable/collapsible functionality
 * Must be used within a CollapsibleRowGroup
 * Position is automatically calculated based on previous rows
 */
export const CollapsibleRow: React.FC<CollapsibleRowProps> = ({
  id,
  label,
  rowCount = 1,
  defaultExpanded = true,
  className,
  style,
  headerClassName,
  headerStyle,
  renderHeader,
  children
}) => {
  const groupContext = useCollapsibleRowGroup();

  if (!groupContext) {
    throw new Error('CollapsibleRow must be used within CollapsibleRowGroup');
  }

  const { registerRow, unregisterRow, getRowState, getCalculatedPosition, toggleRow, version, rowsSize } = groupContext;

  // Register this row on mount
  useEffect(() => {
    registerRow(id, rowCount, defaultExpanded);
    return () => unregisterRow(id);
  }, [id, rowCount, defaultExpanded, registerRow, unregisterRow]);

  const rowState = getRowState(id);
  const isExpanded = rowState?.isExpanded ?? defaultExpanded;

  const rowHeight = useMemo(() => {
    return parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
  }, []);

  const headerHeight = 40; // Fixed header height

  // Get dynamically calculated position - recalculate when version or rowsSize changes
  const startRow = useMemo(() => {
    return getCalculatedPosition(id);
  }, [getCalculatedPosition, id, version, rowsSize]); // Depend on version and rowsSize to trigger recalculation

  const top = useMemo(() => {
    return startRow * rowHeight;
  }, [startRow, rowHeight]);

  const contentTop = useMemo(() => {
    return top + headerHeight;
  }, [top, headerHeight]);

  const contentHeight = useMemo(() => {
    return isExpanded ? (rowCount * rowHeight) : 0;
  }, [isExpanded, rowCount, rowHeight]);

  const handleToggle = useCallback(() => {
    toggleRow(id);
  }, [id, toggleRow]);

  const contextValue = useMemo(
    () => ({
      startRow,
      rowCount,
      isExpanded
    }),
    [startRow, rowCount, isExpanded]
  );

  // Default header renderer
  const defaultHeaderContent = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <span style={{ fontSize: '12px' }}>
        {isExpanded ? '▼' : '▶'}
      </span>
      <span>{label}</span>
    </div>
  );

  return (
    <CollapsibleRowContext.Provider value={contextValue}>
      {/* Header */}
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
        data-collapsible-row-header
        data-row-id={id}
      >
        {renderHeader ? renderHeader({ isExpanded, label, toggle: handleToggle }) : defaultHeaderContent}
      </div>

      {/* Content area */}
      {isExpanded && (
        <>
          {/* Background for content */}
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
            data-collapsible-row-content
            data-row-id={id}
          />

          {/* Children - offset their row prop by startRow and account for header */}
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && typeof child.props.row === 'number') {
              // Calculate absolute row position:
              // - Start at startRow
              // - Add header height (in row units)
              // - Add child's relative row
              const headerRows = headerHeight / rowHeight;
              const absoluteRow = startRow + headerRows + child.props.row;

              // Clone with modified row position and add margin
              return React.cloneElement(child as React.ReactElement<any>, {
                row: absoluteRow,
                style: {
                  ...child.props.style,
                  marginTop: '4px',
                  marginBottom: '4px',
                  height: 'calc(var(--timeline-row-height) - 8px)' // Subtract margins from height
                }
              });
            }
            return child;
          })}
        </>
      )}
    </CollapsibleRowContext.Provider>
  );
};
