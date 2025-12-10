import React, { createContext, useContext, useMemo } from 'react';
import type { RowProps } from '../types';

interface RowContextValue {
  startRow: number;
  rowCount: number;
  rowHeight: number;
}

const RowContext = createContext<RowContextValue | undefined>(undefined);

export const useRowContext = () => {
  const context = useContext(RowContext);
  return context; // Can be undefined if not within a Row
};

/**
 * Row component for organizing TimelineItems
 * Provides vertical layout management for timeline items
 */
export const Row: React.FC<RowProps> = ({
  startRow = 0,
  rowCount = 1,
  height,
  className,
  style,
  children
}) => {
  const effectiveHeight = useMemo(() => {
    if (height !== undefined) return height;
    return parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--timeline-row-height') || '60');
  }, [height]);

  const top = useMemo(() => {
    return startRow * effectiveHeight;
  }, [startRow, effectiveHeight]);

  const totalHeight = useMemo(() => {
    return rowCount * effectiveHeight;
  }, [rowCount, effectiveHeight]);

  const contextValue = useMemo(
    () => ({
      startRow,
      rowCount,
      rowHeight: effectiveHeight
    }),
    [startRow, rowCount, effectiveHeight]
  );

  return (
    <RowContext.Provider value={contextValue}>
      {/* Background for the row */}
      <div
        className={className}
        style={{
          position: 'absolute',
          top,
          left: 0,
          right: 0,
          height: totalHeight,
          zIndex: 1,
          pointerEvents: 'none',
          ...style
        }}
        data-timeline-row
        data-start-row={startRow}
        data-row-count={rowCount}
      />

      {/* Children - offset their row prop by startRow */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && typeof child.props.row === 'number') {
          // Offset child's row by this Row's startRow
          const absoluteRow = startRow + child.props.row;

          return React.cloneElement(child as React.ReactElement<any>, {
            row: absoluteRow
          });
        }
        return child;
      })}
    </RowContext.Provider>
  );
};
