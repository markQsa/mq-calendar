import { useRef, useEffect, useState, useCallback } from 'react';
import { TimelineEngine } from '../../core/TimelineEngine';
import type { TimelineConfig, GridLine, HeaderCell } from '../../core/types';
import type { CalendarLocale } from '../../utils/locales';

export interface UseTimelineEngineOptions {
  startDate: Date;
  endDate: Date;
  containerWidth: number;
  minZoom?: number;
  maxZoom?: number;
  locale?: CalendarLocale;
  animateDateChanges?: boolean;
  animationDuration?: number;
}

export interface UseTimelineEngineReturn {
  engine: TimelineEngine | null;
  gridLines: GridLine[];
  headerCells: HeaderCell[][];
  refresh: () => void;
  refreshCounter: number;
}

/**
 * Hook to manage timeline engine instance
 */
export function useTimelineEngine(options: UseTimelineEngineOptions): UseTimelineEngineReturn {
  const engineRef = useRef<TimelineEngine | null>(null);
  const [gridLines, setGridLines] = useState<GridLine[]>([]);
  const [headerCells, setHeaderCells] = useState<HeaderCell[][]>([]);
  const [engine, setEngine] = useState<TimelineEngine | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const isInitializedRef = useRef(false);
  const prevDatesRef = useRef<{ start: number; end: number } | null>(null);

  // Refresh grid lines and header cells
  const refresh = useCallback(() => {
    if (engineRef.current) {
      setGridLines(engineRef.current.getVisibleGridLines());
      setHeaderCells(engineRef.current.getHeaderCells());
      setRefreshCounter(prev => prev + 1);
    }
  }, []);

  // Initialize engine (only on first mount or when config props change, not dates)
  useEffect(() => {
    if (!isInitializedRef.current) {
      const config: TimelineConfig = {
        viewportStart: options.startDate,
        viewportEnd: options.endDate,
        containerWidth: options.containerWidth,
        minZoom: options.minZoom,
        maxZoom: options.maxZoom,
        locale: options.locale
      };

      const newEngine = new TimelineEngine(config);
      engineRef.current = newEngine;
      setEngine(newEngine);

      // Store initial dates
      prevDatesRef.current = {
        start: options.startDate.getTime(),
        end: options.endDate.getTime()
      };

      // Initial calculation
      setGridLines(newEngine.getVisibleGridLines());
      setHeaderCells(newEngine.getHeaderCells());
      isInitializedRef.current = true;
    }
  }, [options.containerWidth, options.minZoom, options.maxZoom, options.locale, options.startDate, options.endDate]);

  // Handle date range changes with animation
  useEffect(() => {
    if (!engineRef.current || !isInitializedRef.current) return;

    const currentStart = options.startDate.getTime();
    const currentEnd = options.endDate.getTime();
    const prevDates = prevDatesRef.current;

    // Check if dates actually changed
    if (prevDates && (prevDates.start !== currentStart || prevDates.end !== currentEnd)) {
      const animateDateChanges = options.animateDateChanges !== false; // Default to true

      if (animateDateChanges) {
        // Animate to new range
        const duration = options.animationDuration ?? 500;
        engineRef.current.animateToRange(currentStart, currentEnd, duration, () => {
          refresh();
        });
      } else {
        // Instant change without animation
        engineRef.current.zoomToRange(currentStart, currentEnd);
        refresh();
      }

      prevDatesRef.current = { start: currentStart, end: currentEnd };
    }
  }, [options.startDate, options.endDate, options.animateDateChanges, options.animationDuration, refresh]);

  return {
    engine,
    gridLines,
    headerCells,
    refresh,
    refreshCounter
  };
}
