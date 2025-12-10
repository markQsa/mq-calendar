import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CollapsibleRowProps } from '../types';

interface CollapsibleRowState {
  id: string;
  isExpanded: boolean;
  rowCount: number;
  rowHeight: number; // Height in pixels for each row
  order: number; // Order in which rows were registered
}

interface CollapsibleRowGroupContextValue {
  getRowState: (id: string) => CollapsibleRowState | undefined;
  getCalculatedPosition: (id: string) => number;
  getTotalHeight: () => number; // Get total height of all collapsible rows
  getRowAtPixelY: (pixelY: number) => { rowId: string; relativeRow: number; isInHeader: boolean; offsetInRow: number } | null;
  toggleRow: (id: string) => void;
  registerRow: (id: string, rowCount: number, rowHeight: number, defaultExpanded: boolean) => void;
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

  const registerRow = useCallback((id: string, rowCount: number, rowHeight: number, defaultExpanded: boolean) => {
    setRows(prev => {
      // Only update if row doesn't exist
      if (prev.has(id)) {
        return prev;
      }
      const newMap = new Map(prev);
      newMap.set(id, { id, rowCount, rowHeight, isExpanded: defaultExpanded, order: orderCounterRef.current });
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
    const headerHeight = 40;
    const defaultHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');

    let cumulativeHeight = 0; // Track in pixels
    const rowArray = Array.from(rows.values()).sort((a, b) => a.order - b.order);

    for (const row of rowArray) {
      if (row.id === id) {
        break;
      }

      // Add header height
      cumulativeHeight += headerHeight;

      // Add content height if expanded (rowCount * individual rowHeight)
      if (row.isExpanded) {
        cumulativeHeight += row.rowCount * row.rowHeight;
      }
    }

    // Return position in "row units" relative to default height for backward compatibility
    // Components will convert this back to pixels using their own height
    return cumulativeHeight / defaultHeight;
  }, [rows]);

  // Get total height of all collapsible rows
  const getTotalHeight = useCallback((): number => {
    const headerHeight = 40;
    let totalHeight = 0; // Track in pixels

    const rowArray = Array.from(rows.values());

    for (const row of rowArray) {
      totalHeight += headerHeight;
      if (row.isExpanded) {
        totalHeight += row.rowCount * row.rowHeight;
      }
    }

    return totalHeight; // Return actual pixel height
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
      const headerEnd = currentY + headerHeight;

      // Check if in header
      if (pixelY >= currentY && pixelY < headerEnd) {
        return {
          rowId: row.id,
          relativeRow: 0,
          isInHeader: true,
          offsetInRow: pixelY - currentY
        };
      }

      currentY = headerEnd;

      if (!row.isExpanded) continue;

      // Check if in content area
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
      getTotalHeight,
      getRowAtPixelY,
      toggleRow,
      registerRow,
      unregisterRow,
      version,
      rowsSize: rows.size  // Add rows.size to force updates when rows are added/removed
    }),
    [getRowState, getCalculatedPosition, getTotalHeight, getRowAtPixelY, toggleRow, registerRow, unregisterRow, version, rows.size]
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
  rowHeight: number;
  isExpanded: boolean;
  collapsible: boolean;
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
  height,
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

  // Compute effective height
  const effectiveHeight = useMemo(() => {
    if (height !== undefined) return height;
    return parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
  }, [height]);

  // Register this row on mount
  useEffect(() => {
    registerRow(id, rowCount, effectiveHeight, defaultExpanded);
    return () => unregisterRow(id);
  }, [id, rowCount, effectiveHeight, defaultExpanded, registerRow, unregisterRow]);

  const rowState = getRowState(id);
  const isExpanded = rowState?.isExpanded ?? defaultExpanded;

  const headerHeight = 40; // Fixed header height

  // Get dynamically calculated position - recalculate when version or rowsSize changes
  const startRow = useMemo(() => {
    return getCalculatedPosition(id);
  }, [getCalculatedPosition, id, version, rowsSize]); // Depend on version and rowsSize to trigger recalculation

  // Convert position from "row units" to actual pixels using default height
  const top = useMemo(() => {
    const defaultHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
    return startRow * defaultHeight;
  }, [startRow]);

  const contentTop = useMemo(() => {
    return top + headerHeight;
  }, [top, headerHeight]);

  const contentHeight = useMemo(() => {
    return isExpanded ? (rowCount * effectiveHeight) : 0;
  }, [isExpanded, rowCount, effectiveHeight]);

  const handleToggle = useCallback(() => {
    toggleRow(id);
  }, [id, toggleRow]);

  const contextValue = useMemo(
    () => ({
      startRow,
      rowCount,
      rowHeight: effectiveHeight,
      isExpanded,
      collapsible: true
    }),
    [startRow, rowCount, effectiveHeight, isExpanded]
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
              // - Add header height (in row units using default height for compatibility)
              // - Add child's relative row
              const defaultHeight = parseInt(getComputedStyle(document.documentElement)
                .getPropertyValue('--timeline-row-height') || '60');
              const headerRows = headerHeight / defaultHeight;
              const absoluteRow = startRow + headerRows + child.props.row;

              // Clone with modified row position and add margin
              return React.cloneElement(child as React.ReactElement<any>, {
                row: absoluteRow,
                style: {
                  ...child.props.style,
                  marginTop: '4px',
                  marginBottom: '4px',
                  height: `${effectiveHeight - 8}px` // Use effective height, subtract margins
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
