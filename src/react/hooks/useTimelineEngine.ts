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

  // Initialize engine
  useEffect(() => {
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

    // Initial calculation
    setGridLines(newEngine.getVisibleGridLines());
    setHeaderCells(newEngine.getHeaderCells());
  }, [options.startDate, options.endDate, options.containerWidth, options.minZoom, options.maxZoom, options.locale]);

  // Refresh grid lines and header cells
  const refresh = useCallback(() => {
    if (engineRef.current) {
      setGridLines(engineRef.current.getVisibleGridLines());
      setHeaderCells(engineRef.current.getHeaderCells());
      setRefreshCounter(prev => prev + 1);
    }
  }, []);

  return {
    engine,
    gridLines,
    headerCells,
    refresh,
    refreshCounter
  };
}
