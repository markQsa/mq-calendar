import React, { useState } from 'react';
import type { HeaderCell } from '../../core/types';
import type { TimelineClassNames, TimelineStyles, HeaderCellRenderParams } from '../types';

export interface CalendarHeaderProps {
  headerCells: HeaderCell[][];
  classNames?: TimelineClassNames;
  styles?: TimelineStyles;
  renderHeaderCell?: (params: HeaderCellRenderParams) => React.ReactNode;
  onHeaderCellClick?: (cell: HeaderCell) => void;
  showNavigation?: boolean;
  onNavigateBackward?: () => void;
  onNavigateForward?: () => void;
}

/**
 * Timeline header component displaying time units using SVG
 */
export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  headerCells,
  classNames = {},
  styles = {},
  renderHeaderCell,
  onHeaderCellClick,
  showNavigation = false,
  onNavigateBackward,
  onNavigateForward
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ rowIndex: number; cellIndex: number; part: import('../../core/types').TimeUnit } | null>(null);

  // Calculate header row height from CSS variable or default
  const rowHeight = 40; // Default, will be overridden by CSS variable

  // Calculate max position for viewBox (same as content area)
  const maxPosition = headerCells.length > 0 && headerCells[0].length > 0
    ? Math.max(...headerCells[0].map(cell => cell.position + cell.width)) + 100
    : 1000;

  return (
    <div
      className={classNames.header}
      style={{
        position: 'relative',
        background: 'var(--timeline-header-bg)',
        borderBottom: '1px solid var(--timeline-header-border)',
        fontFamily: 'var(--timeline-header-font)',
        userSelect: 'none',
        overflow: 'hidden',
        flexShrink: 0,
        ...styles.header
      }}
      data-timeline-header
    >
      {/* Navigation buttons */}
      {showNavigation && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 8px',
            zIndex: 10,
            background: 'var(--timeline-header-bg)',
            borderRight: '1px solid var(--timeline-header-border)'
          }}
        >
          <button
            onClick={onNavigateBackward}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid var(--timeline-header-border)',
              borderRadius: '4px',
              background: 'var(--timeline-header-bg)',
              color: 'var(--timeline-header-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--timeline-grid-line)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--timeline-header-bg)'}
            title="Previous"
          >
            ‹
          </button>
          <button
            onClick={onNavigateForward}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid var(--timeline-header-border)',
              borderRadius: '4px',
              background: 'var(--timeline-header-bg)',
              color: 'var(--timeline-header-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--timeline-grid-line)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--timeline-header-bg)'}
            title="Next"
          >
            ›
          </button>
        </div>
      )}

      {headerCells.map((row, rowIndex) => {
        return (
          <div
            key={rowIndex}
            className={classNames.headerRow}
            style={{
              position: 'relative',
              height: 'var(--timeline-header-row-height)',
              borderBottom: rowIndex < headerCells.length - 1 ? '1px solid var(--timeline-header-border)' : 'none',
              ...styles.headerRow
            }}
            data-timeline-header-row
            data-level={rowIndex}
          >

          {/* SVG for grid lines and text */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${maxPosition}px`,
              height: '100%',
              overflow: 'visible'
            }}
          >
            {row.map((cell, cellIndex) => {
              const params: HeaderCellRenderParams = {
                timestamp: cell.timestamp,
                label: cell.label,
                type: cell.type,
                isPrimary: cell.isPrimary,
                level: cell.level,
                width: cell.width,
                position: cell.position
              };

              if (renderHeaderCell) {
                // For custom rendering, use foreignObject to embed HTML/React
                return (
                  <foreignObject
                    key={cellIndex}
                    x={cell.position}
                    y={0}
                    width={cell.width}
                    height={rowHeight}
                  >
                    {renderHeaderCell(params)}
                  </foreignObject>
                );
              }

              // Check if cell has parts (split caption like "Jan 2025")
              const hasParts = cell.parts && cell.parts.length > 0;

              return (
                <g
                  key={cellIndex}
                  data-timeline-header-cell
                  style={{ cursor: onHeaderCellClick ? 'pointer' : 'default' }}
                >
                  {/* Clip path to prevent text overflow */}
                  <defs>
                    <clipPath id={`clip-${cellIndex}-${rowIndex}`}>
                      <rect
                        x={cell.position}
                        y={0}
                        width={cell.width}
                        height={rowHeight}
                      />
                    </clipPath>
                  </defs>

                  {/* Vertical separator line */}
                  <line
                    x1={cell.position + cell.width}
                    y1={0}
                    x2={cell.position + cell.width}
                    y2={rowHeight}
                    stroke={`var(--timeline-${cell.type}-line, var(--timeline-header-border))`}
                    strokeWidth={1}
                    style={{ pointerEvents: 'none' }}
                  />

                  {hasParts ? (
                    // Render split parts (e.g., month on left, year on right, or week + month + year)
                    <>
                      {cell.parts!.map((part, partIndex) => {
                        // Calculate cumulative position for this part
                        let partX = cell.position;
                        for (let i = 0; i < partIndex; i++) {
                          partX += cell.width * cell.parts![i].widthFraction;
                        }
                        const partWidth = cell.width * part.widthFraction;
                        const isHovered = hoveredCell?.rowIndex === rowIndex && hoveredCell?.cellIndex === cellIndex && hoveredCell?.part === part.type;

                        // Determine text alignment based on number of parts
                        const numParts = cell.parts!.length;
                        let textAnchor: 'start' | 'middle' | 'end';
                        let textX: number;

                        if (numParts === 2) {
                          // 2 parts: left-aligned and right-aligned
                          textAnchor = partIndex === 0 ? 'start' : 'end';
                          textX = partIndex === 0 ? partX + 8 : partX + partWidth - 8;
                        } else if (numParts === 3) {
                          // 3 parts: left, center, right
                          if (partIndex === 0) {
                            textAnchor = 'start';
                            textX = partX + 8;
                          } else if (partIndex === 1) {
                            textAnchor = 'middle';
                            textX = partX + partWidth / 2;
                          } else {
                            textAnchor = 'end';
                            textX = partX + partWidth - 8;
                          }
                        } else {
                          // Fallback for other cases
                          textAnchor = 'start';
                          textX = partX + 8;
                        }

                        return (
                          <g key={partIndex}>
                            {onHeaderCellClick && (
                              <rect
                                x={partX}
                                y={0}
                                width={partWidth}
                                height={rowHeight}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredCell({ rowIndex, cellIndex, part: part.type })}
                                onMouseLeave={() => setHoveredCell(null)}
                                onClick={() => onHeaderCellClick({ ...cell, timestamp: part.timestamp, type: part.type })}
                              />
                            )}
                            <text
                              x={textX}
                              y={rowHeight / 2}
                              textAnchor={textAnchor}
                              dominantBaseline="middle"
                              fill={`var(--timeline-${part.type}-text, var(--timeline-header-text))`}
                              fontSize={cell.isPrimary ? 14 : 12}
                              fontWeight={part.type === cell.type ? 600 : 400}
                              opacity={isHovered ? 1 : 0.85}
                              clipPath={`url(#clip-${cellIndex}-${rowIndex})`}
                              className={classNames.headerCell}
                              data-type={part.type}
                              style={{
                                pointerEvents: 'none',
                                transition: 'opacity 0.15s ease'
                              }}
                            >
                              <title>{part.label}</title>
                              {part.label}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  ) : (
                    // Render single label (normal case)
                    <>
                      {onHeaderCellClick && (
                        <rect
                          x={cell.position}
                          y={0}
                          width={cell.width}
                          height={rowHeight}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredCell({ rowIndex, cellIndex, part: cell.type })}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => onHeaderCellClick(cell)}
                        />
                      )}
                      <text
                        x={cell.position + 8}
                        y={rowHeight / 2}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fill={`var(--timeline-${cell.type}-text, var(--timeline-header-text))`}
                        fontSize={cell.isPrimary ? 14 : 12}
                        fontWeight={600}
                        opacity={hoveredCell?.rowIndex === rowIndex && hoveredCell?.cellIndex === cellIndex ? 1 : 0.85}
                        clipPath={`url(#clip-${cellIndex}-${rowIndex})`}
                        className={classNames.headerCell}
                        data-type={cell.type}
                        data-primary={cell.isPrimary}
                        style={{
                          pointerEvents: 'none',
                          transition: 'opacity 0.15s ease'
                        }}
                      >
                        <title>{cell.label}</title>
                        {cell.label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        );
      })}
    </div>
  );
};
