import React, { useRef, useEffect, useMemo, useCallback, CSSProperties } from 'react';
import type { TimelineCalendarProps, TimelineTheme } from '../types';
import { useTimelineEngine } from '../hooks/useTimelineEngine';
import { useResize } from '../hooks/useResize';
import { useWheel } from '../hooks/useWheel';
import { useTouch } from '../hooks/useTouch';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { CalendarHeader } from './CalendarHeader';
import { CalendarContent } from './CalendarContent';
import { CurrentTimeLine } from './CurrentTimeLine';
import { AvailabilityOverlay } from './AvailabilityOverlay';
import { TimelineContext } from './TimelineContext';
import { defaultTimeConverter } from '../../utils/timeConverter';
import { timeSpanToZoom, getEndOfPeriod } from '../../utils/dateUtils';
import { themes } from '../themes';
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
  currentTimeLineWidth = 2,
  timeConverter = defaultTimeConverter,
  locale,
  theme = 'light',
  classNames = {},
  styles = {},
  renderHeaderCell,
  renderGridLine,
  availability,
  children,
  onViewportChange,
  onZoomChange,
  animateDateChanges = true,
  animationDuration = 500,
  touchMomentum = true,
  touchDecelerationRate = 0.95,
  sidebar
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useResize(rootRef);

  // Resolve theme - either use preset name or custom object
  const resolvedTheme = useMemo<TimelineTheme>(() => {
    if (typeof theme === 'string') {
      return themes[theme] || themes.light;
    }
    return theme;
  }, [theme]);

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
    locale,
    animateDateChanges,
    animationDuration
  });

  // Effect to notify zoom/viewport changes during date animations
  // This is triggered by refreshCounter changes from the animation
  useEffect(() => {
    if (!engine) return;

    if (onZoomChange) {
      const zoom = engine.getZoomState();
      onZoomChange(zoom.pixelsPerMs);
    }

    if (onViewportChange) {
      const viewport = engine.getViewportState();
      onViewportChange(new Date(viewport.start), new Date(viewport.end));
    }
  }, [engine, onViewportChange, onZoomChange, refreshCounter]);

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
  }, [engine, containerWidth, refresh]);

  // Handle wheel events (scroll and zoom)
  useWheel(rootRef, {
    onWheel: (deltaX) => {
      if (!engine) return;

      // Horizontal timeline scroll (deltaX is always the scroll amount from useWheel)
      engine.scroll(deltaX);
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

  // Handle touch events (scroll and pinch-to-zoom with momentum)
  useTouch(rootRef, {
    onScroll: (deltaX) => {
      if (!engine) return;

      engine.scroll(deltaX);
      refresh();

      if (onViewportChange) {
        const viewport = engine.getViewportState();
        onViewportChange(new Date(viewport.start), new Date(viewport.end));
      }
    },
    onZoom: (delta, clientX) => {
      if (!engine) return;

      engine.zoom(delta, clientX);
      refresh();

      if (onZoomChange) {
        const zoomState = engine.getZoomState();
        onZoomChange(zoomState.pixelsPerMs);
      }

      if (onViewportChange) {
        const viewport = engine.getViewportState();
        onViewportChange(new Date(viewport.start), new Date(viewport.end));
      }
    },
    momentum: touchMomentum,
    decelerationRate: touchDecelerationRate
  });


  // Build CSS variables from theme
  const cssVars = useMemo((): CSSProperties => {
    const vars: Record<string, string> = {
      '--timeline-bg': resolvedTheme.colors?.background || '#ffffff',
      '--timeline-grid-line': resolvedTheme.colors?.gridLine || '#e0e0e0',
      '--timeline-grid-line-primary': resolvedTheme.colors?.gridLinePrimary || '#b0b0b0',
      '--timeline-header-bg': resolvedTheme.colors?.headerBackground || '#f5f5f5',
      '--timeline-header-text': resolvedTheme.colors?.headerText || '#333333',
      '--timeline-header-border': resolvedTheme.colors?.headerBorder || '#d0d0d0',
      '--timeline-current-time-line': resolvedTheme.colors?.currentTimeLine || '#ff4444',
      '--timeline-header-font': resolvedTheme.fonts?.header || 'system-ui, sans-serif',
      '--timeline-content-font': resolvedTheme.fonts?.content || 'system-ui, sans-serif',
      '--timeline-header-height': `${resolvedTheme.spacing?.headerHeight || 80}px`,
      '--timeline-header-row-height': `${resolvedTheme.spacing?.headerRowHeight || 40}px`,
      '--timeline-row-height': `${resolvedTheme.spacing?.rowHeight || 60}px`,
      '--timeline-row-header-height': `${resolvedTheme.spacing?.rowHeaderHeight || 40}px`
    };

    // Add time type specific colors
    if (resolvedTheme.colors?.timeTypes) {
      const timeTypes = ['century', 'decade', 'year', 'month', 'week', 'day', 'halfday', 'quarterday',
                         'hour', 'halfhour', 'quarterhour', 'minute', 'halfminute', 'quarterminute',
                         'second', 'millisecond'] as const;

      timeTypes.forEach(type => {
        const typeColors = resolvedTheme.colors?.timeTypes?.[type];
        if (typeColors?.text) {
          vars[`--timeline-${type}-text`] = typeColors.text;
        }
        if (typeColors?.line) {
          vars[`--timeline-${type}-line`] = typeColors.line;
        }
      });
    }

    return vars as CSSProperties;
  }, [resolvedTheme]);

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

  // Scroll sync: sync sidebar body scrollTop with the content area
  const handleContentScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    if (sidebarBodyRef.current) {
      sidebarBodyRef.current.scrollTop = target.scrollTop;
    }
  }, []);

  const sidebarRef = useRef(sidebar);
  sidebarRef.current = sidebar;

  useEffect(() => {
    if (!sidebarRef.current) return;

    // Find the [data-timeline-content] element inside the root
    const root = rootRef.current;
    if (!root) return;
    const contentEl = root.querySelector('[data-timeline-content]');
    if (!contentEl) return;

    contentEl.addEventListener('scroll', handleContentScroll);
    return () => {
      contentEl.removeEventListener('scroll', handleContentScroll);
    };
  }, [handleContentScroll]);

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

  // Shared calendar content (used in both sidebar and non-sidebar layouts)
  const calendarHeader = (
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
  );

  const calendarContent = (
    <CalendarContent
      gridLines={gridLines}
      classNames={classNames}
      styles={styles}
      renderGridLine={renderGridLine}
    >
      {availability && <AvailabilityOverlay config={availability} />}
      {children}
    </CalendarContent>
  );

  const currentTimeLine = showCurrentTime && engine ? (
    <CurrentTimeLine
      currentTime={currentTime}
      viewportStart={engine.getViewportState().start}
      pixelsPerMs={currentPixelsPerMs}
      lineWidth={currentTimeLineWidth}
      styles={styles}
    />
  ) : null;

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
        {sidebar ? (
          <>
            {/* Header row: sidebar header + calendar header */}
            <div style={{ display: 'flex', flexShrink: 0 }}>
              <div
                style={{
                  width: sidebar.width,
                  flexShrink: 0,
                  height: 'var(--timeline-header-height)',
                  borderRight: '1px solid var(--timeline-header-border)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {sidebar.headerContent}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {calendarHeader}
              </div>
            </div>
            {/* Content row: sidebar body + calendar content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <div
                ref={sidebarBodyRef}
                style={{
                  width: sidebar.width,
                  flexShrink: 0,
                  overflowY: 'hidden',
                  borderRight: '1px solid var(--timeline-header-border)',
                  boxSizing: 'border-box',
                }}
              >
                {sidebar.content}
              </div>
              <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {calendarContent}
                {currentTimeLine}
              </div>
            </div>
          </>
        ) : (
          <>
            {calendarHeader}
            {calendarContent}
            {currentTimeLine}
          </>
        )}
      </div>
    </TimelineContext.Provider>
  );
};
