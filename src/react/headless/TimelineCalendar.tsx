import React, { useRef, useEffect, useMemo, CSSProperties } from 'react';
import type { TimelineCalendarProps } from '../types';
import { useTimelineEngine } from '../hooks/useTimelineEngine';
import { useResize } from '../hooks/useResize';
import { useWheel } from '../hooks/useWheel';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { CalendarHeader } from './CalendarHeader';
import { CalendarContent } from './CalendarContent';
import { CurrentTimeLine } from './CurrentTimeLine';
import { TimelineContext } from './TimelineContext';
import { defaultTimeConverter } from '../../utils/timeConverter';
import { timeSpanToZoom, getEndOfPeriod } from '../../utils/dateUtils';
import type { HeaderCell } from '../../core/types';

/**
 * Main Timeline Calendar component (headless)
 */
export const TimelineCalendar: React.FC<TimelineCalendarProps> = ({
  startDate,
  endDate,
  width = '100%',
  height = '600px',
  minZoom,
  maxZoom,
  showNavigation = false,
  showCurrentTime = false,
  timeConverter = defaultTimeConverter,
  locale,
  theme = {},
  classNames = {},
  styles = {},
  renderHeaderCell,
  renderGridLine,
  children,
  onViewportChange,
  onZoomChange
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useResize(rootRef);

  // Convert start/end dates using time converter
  const startTimestamp = useMemo(() => timeConverter.toTimestamp(startDate), [startDate, timeConverter]);
  const endTimestamp = useMemo(() => timeConverter.toTimestamp(endDate), [endDate, timeConverter]);

  // Memoize Date objects to prevent re-creating on every render
  const startDateObj = useMemo(() => new Date(startTimestamp), [startTimestamp]);
  const endDateObj = useMemo(() => new Date(endTimestamp), [endTimestamp]);

  // Convert zoom values from human-readable strings to numbers if needed
  const minZoomValue = useMemo(() => {
    if (typeof minZoom === 'string') {
      return timeSpanToZoom(minZoom, containerWidth || 1400);
    }
    return minZoom;
  }, [minZoom, containerWidth]);

  const maxZoomValue = useMemo(() => {
    if (typeof maxZoom === 'string') {
      return timeSpanToZoom(maxZoom, containerWidth || 1400);
    }
    return maxZoom;
  }, [maxZoom, containerWidth]);

  // Initialize timeline engine
  const { engine, gridLines, headerCells, refresh, refreshCounter } = useTimelineEngine({
    startDate: startDateObj,
    endDate: endDateObj,
    containerWidth: containerWidth || 1000, // Default width until measured
    minZoom: minZoomValue,
    maxZoom: maxZoomValue,
    locale
  });

  // Get current zoom state for current time line
  const currentPixelsPerMs = engine?.getZoomState().pixelsPerMs || 0;

  // Use current time with auto-refresh
  const { currentTime } = useCurrentTime({
    pixelsPerMs: currentPixelsPerMs,
    enabled: showCurrentTime
  });

  // Handle container resize
  useEffect(() => {
    if (engine && containerWidth > 0) {
      engine.updateContainerWidth(containerWidth);
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, containerWidth]);

  // Handle wheel events (scroll and zoom)
  useWheel(rootRef, {
    onWheel: (deltaX, deltaY) => {
      if (!engine) return;

      // Horizontal scroll
      const scrollDelta = deltaX !== 0 ? deltaX : deltaY;
      engine.scroll(scrollDelta);
      refresh();

      // Notify viewport change
      if (onViewportChange) {
        const viewport = engine.getViewportState();
        onViewportChange(new Date(viewport.start), new Date(viewport.end));
      }
    },
    onZoom: (delta, clientX) => {
      if (!engine) return;

      // Apply zoom centered at mouse position
      engine.zoom(delta, clientX);
      refresh();

      // Notify zoom change
      if (onZoomChange) {
        const zoomState = engine.getZoomState();
        onZoomChange(zoomState.pixelsPerMs);
      }

      // Notify viewport change
      if (onViewportChange) {
        const viewport = engine.getViewportState();
        onViewportChange(new Date(viewport.start), new Date(viewport.end));
      }
    }
  });

  // Build CSS variables from theme
  const cssVars = useMemo((): CSSProperties => {
    const vars: Record<string, string> = {
      '--timeline-bg': theme.colors?.background || '#ffffff',
      '--timeline-grid-line': theme.colors?.gridLine || '#e0e0e0',
      '--timeline-grid-line-primary': theme.colors?.gridLinePrimary || '#b0b0b0',
      '--timeline-header-bg': theme.colors?.headerBackground || '#f5f5f5',
      '--timeline-header-text': theme.colors?.headerText || '#333333',
      '--timeline-header-border': theme.colors?.headerBorder || '#d0d0d0',
      '--timeline-current-time-line': theme.colors?.currentTimeLine || '#ff4444',
      '--timeline-header-font': theme.fonts?.header || 'system-ui, sans-serif',
      '--timeline-content-font': theme.fonts?.content || 'system-ui, sans-serif',
      '--timeline-header-height': `${theme.spacing?.headerHeight || 80}px`,
      '--timeline-header-row-height': `${theme.spacing?.headerRowHeight || 40}px`,
      '--timeline-row-height': `${theme.spacing?.rowHeight || 60}px`
    };

    // Add time type specific colors
    if (theme.colors?.timeTypes) {
      const timeTypes = ['century', 'decade', 'year', 'month', 'week', 'day', 'halfday', 'quarterday',
                         'hour', 'halfhour', 'quarterhour', 'minute', 'halfminute', 'quarterminute',
                         'second', 'millisecond'] as const;

      timeTypes.forEach(type => {
        const typeColors = theme.colors?.timeTypes?.[type];
        if (typeColors?.text) {
          vars[`--timeline-${type}-text`] = typeColors.text;
        }
        if (typeColors?.line) {
          vars[`--timeline-${type}-line`] = typeColors.line;
        }
      });
    }

    return vars as CSSProperties;
  }, [theme]);

  // Handle header cell click to zoom to that period
  const handleHeaderCellClick = async (cell: HeaderCell) => {
    if (!engine) return;

    const startTimestamp = cell.timestamp;
    const endTimestamp = getEndOfPeriod(startTimestamp, cell.type);

    // Animate to the range with smooth transition
    await engine.animateToRange(startTimestamp, endTimestamp, 600, () => {
      // Called on each animation frame
      refresh();

      // Notify callbacks
      if (onZoomChange) {
        const zoom = engine.getZoomState();
        onZoomChange(zoom.pixelsPerMs);
      }

      if (onViewportChange) {
        const viewport = engine.getViewportState();
        onViewportChange(new Date(viewport.start), new Date(viewport.end));
      }
    });
  };

  // Handle navigation backward
  const handleNavigateBackward = async () => {
    if (!engine) return;

    await engine.navigateBackward(() => {
      // Called on each animation frame
      refresh();

      // Notify callbacks
      if (onViewportChange) {
        const viewport = engine.getViewportState();
        onViewportChange(new Date(viewport.start), new Date(viewport.end));
      }
    });
  };

  // Handle navigation forward
  const handleNavigateForward = async () => {
    if (!engine) return;

    await engine.navigateForward(() => {
      // Called on each animation frame
      refresh();

      // Notify callbacks
      if (onViewportChange) {
        const viewport = engine.getViewportState();
        onViewportChange(new Date(viewport.start), new Date(viewport.end));
      }
    });
  };

  // Context value
  const contextValue = useMemo(
    () => ({
      engine,
      refresh,
      timeConverter,
      refreshCounter
    }),
    [engine, refresh, timeConverter, refreshCounter]
  );

  return (
    <TimelineContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        className={classNames.root}
        style={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...cssVars,
          ...styles.root
        }}
        data-timeline-calendar
      >
        <CalendarHeader
          headerCells={headerCells}
          classNames={classNames}
          styles={styles}
          renderHeaderCell={renderHeaderCell}
          onHeaderCellClick={handleHeaderCellClick}
          showNavigation={showNavigation}
          onNavigateBackward={handleNavigateBackward}
          onNavigateForward={handleNavigateForward}
        />
        <CalendarContent
          gridLines={gridLines}
          classNames={classNames}
          styles={styles}
          renderGridLine={renderGridLine}
        >
          {children}
        </CalendarContent>

        {/* Current time line - spans entire calendar height */}
        {showCurrentTime && engine && (
          <CurrentTimeLine
            currentTime={currentTime}
            viewportStart={engine.getViewportState().start}
            pixelsPerMs={currentPixelsPerMs}
            styles={styles}
          />
        )}
      </div>
    </TimelineContext.Provider>
  );
};
