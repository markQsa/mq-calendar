import React, { ReactNode, useState, useEffect } from 'react';
import type { GridLine } from '../../core/types';
import type { TimelineClassNames, TimelineStyles, GridLineRenderParams } from '../types';
import { useTimelineRowGroup } from './TimelineRow';

export interface CalendarContentProps {
  gridLines: GridLine[];
  classNames?: TimelineClassNames;
  styles?: TimelineStyles;
  renderGridLine?: (params: GridLineRenderParams) => ReactNode;
  children?: ReactNode;
}

/**
 * Timeline content area with SVG grid lines and items
 */
export const CalendarContent: React.FC<CalendarContentProps> = ({
  gridLines,
  classNames = {},
  styles = {},
  renderGridLine,
  children
}) => {
  // Get row group context to calculate content height
  const rowGroupContext = useTimelineRowGroup();
  const [minHeight, setMinHeight] = useState(200);

  // Calculate minimum height needed for all rows whenever context changes
  useEffect(() => {
    if (rowGroupContext) {
      const height = rowGroupContext.getTotalHeight();
      setMinHeight(height);
    }
  }, [rowGroupContext, rowGroupContext?.version]);

  // Find the maximum position to set viewBox width
  const maxPosition = gridLines.length > 0
    ? Math.max(...gridLines.map(l => l.position)) + 100
    : 1000;

  return (
    <div
      className={classNames.content}
      style={{
        position: 'relative',
        flex: '1 1 auto',
        overflow: 'hidden',
        background: 'var(--timeline-bg)',
        fontFamily: 'var(--timeline-content-font)',
        minHeight: `${minHeight}px`,
        ...styles.content
      }}
      data-timeline-content
    >
      {/* SVG Grid lines */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${maxPosition}px`,
          height: '100%',
          pointerEvents: 'none'
        }}
        data-timeline-grid
      >
        {renderGridLine ? (
          // Custom rendering
          gridLines.map((line, index) => {
            const params: GridLineRenderParams = {
              timestamp: line.timestamp,
              type: line.type,
              isPrimary: line.isPrimary,
              level: line.level,
              position: line.position,
              label: line.label
            };
            return (
              <g key={index} transform={`translate(${line.position}, 0)`}>
                {renderGridLine(params)}
              </g>
            );
          })
        ) : (
          // Default SVG rendering
          <g className={classNames.gridLine}>
            {gridLines.map((line, index) => (
              <line
                key={index}
                x1={line.position}
                y1="0"
                x2={line.position}
                y2="100%"
                stroke={`var(--timeline-${line.type}-line, ${line.isPrimary
                  ? 'var(--timeline-grid-line-primary)'
                  : 'var(--timeline-grid-line)'})`}
                strokeWidth={line.isPrimary ? 1.5 : 1}
                opacity={line.isPrimary ? 0.6 : 0.3}
                data-type={line.type}
                data-primary={line.isPrimary}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Content layer */}
      <div
        className={classNames.contentInner}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          ...styles.contentInner
        }}
        data-timeline-content-inner
      >
        {children}
      </div>
    </div>
  );
};
