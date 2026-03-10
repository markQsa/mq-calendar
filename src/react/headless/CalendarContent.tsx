import React, { ReactNode, useRef, useState, useEffect } from 'react';
import type { GridLine } from '../../core/types';
import type { TimelineClassNames, TimelineStyles, GridLineRenderParams } from '../types';

export interface CalendarContentProps {
  gridLines: GridLine[];
  classNames?: TimelineClassNames;
  styles?: TimelineStyles;
  renderGridLine?: (params: GridLineRenderParams) => ReactNode;
  children?: ReactNode;
}

function measureAbsoluteContentHeight(root: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  let maxBottom = 0;

  const elements = root.querySelectorAll<HTMLElement>('*');

  elements.forEach((element) => {
    const computedStyle = getComputedStyle(element);

    if (computedStyle.position !== 'absolute') {
      return;
    }

    const styleTop = Number.parseFloat(computedStyle.top);
    const styleHeight = Number.parseFloat(computedStyle.height);
    const rectBottom = element.getBoundingClientRect().bottom - rootRect.top;
    const styleBottom =
      Number.isFinite(styleTop) && Number.isFinite(styleHeight)
        ? styleTop + styleHeight
        : 0;
    const offsetBottom = element.offsetTop + element.offsetHeight;

    maxBottom = Math.max(maxBottom, rectBottom, styleBottom, offsetBottom);
  });

  return maxBottom;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const contentInnerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure the scrollable content height so the SVG grid covers the entire
  // area. The timeline uses absolute positioning heavily, so scrollHeight on
  // its own can under-report the real height on smaller screens.
  useEffect(() => {
    const el = containerRef.current;
    const innerEl = contentInnerRef.current;
    if (!el || !innerEl) return;

    const measure = () => {
      const h = Math.max(
        el.clientHeight,
        el.scrollHeight,
        innerEl.clientHeight,
        innerEl.scrollHeight,
        measureAbsoluteContentHeight(innerEl)
      );
      setContentHeight(prev => (prev !== h ? h : prev));
    };

    measure();

    // Re-measure when child elements are added/removed or repositioned
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

    // Re-measure when the container itself resizes
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(innerEl);

    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, []);

  // Find the maximum position to set viewBox width
  const maxPosition = gridLines.length > 0
    ? Math.max(...gridLines.map(l => l.position)) + 100
    : 1000;

  return (
    <div
      ref={containerRef}
      className={classNames.content}
      style={{
        position: 'relative',
        flex: '1 1 auto',
        overflowX: 'hidden',
        overflowY: 'auto',
        background: 'var(--timeline-bg)',
        fontFamily: 'var(--timeline-content-font)',
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
          height: contentHeight > 0 ? `${contentHeight}px` : '100%',
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
        ref={contentInnerRef}
        className={classNames.contentInner}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: contentHeight > 0 ? `${contentHeight}px` : '100%',
          ...styles.contentInner
        }}
        data-timeline-content-inner
      >
        {children}
      </div>
    </div>
  );
};
