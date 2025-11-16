import { useState, useEffect, useRef } from 'react';
import { TIME_UNIT_MS } from '../../utils/dateUtils';

/**
 * Calculate appropriate refresh interval based on zoom level
 * The more zoomed in (higher pixelsPerMs), the more frequently we should update
 */
function getRefreshInterval(pixelsPerMs: number): number {
  // Calculate which time unit is approximately 100-200 pixels wide at this zoom
  // This ensures the line moves noticeably but not too frequently

  // If seconds are visible (second is ~100px wide), update every second
  if (TIME_UNIT_MS.second * pixelsPerMs >= 100) {
    return 1000; // 1 second
  }

  // If minutes are visible, update every 10 seconds
  if (TIME_UNIT_MS.minute * pixelsPerMs >= 100) {
    return 10 * 1000; // 10 seconds
  }

  // If hours are visible, update every minute
  if (TIME_UNIT_MS.hour * pixelsPerMs >= 100) {
    return 60 * 1000; // 1 minute
  }

  // If days are visible, update every 10 minutes
  if (TIME_UNIT_MS.day * pixelsPerMs >= 100) {
    return 10 * 60 * 1000; // 10 minutes
  }

  // If weeks are visible, update every hour
  if (TIME_UNIT_MS.week * pixelsPerMs >= 100) {
    return 60 * 60 * 1000; // 1 hour
  }

  // If months are visible, update every 6 hours
  if (TIME_UNIT_MS.month * pixelsPerMs >= 100) {
    return 6 * 60 * 60 * 1000; // 6 hours
  }

  // For very zoomed out views (years, decades), update once per day
  return 24 * 60 * 60 * 1000; // 24 hours
}

export interface UseCurrentTimeOptions {
  /** Current zoom level (pixels per millisecond) */
  pixelsPerMs: number;
  /** Whether to enable auto-refresh */
  enabled: boolean;
}

export interface UseCurrentTimeReturn {
  /** Current timestamp */
  currentTime: number;
}

/**
 * Hook to manage current time with zoom-adaptive auto-refresh
 */
export function useCurrentTime(options: UseCurrentTimeOptions): UseCurrentTimeReturn {
  const { pixelsPerMs, enabled } = options;
  const [currentTime, setCurrentTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Calculate refresh interval based on zoom
    const interval = getRefreshInterval(pixelsPerMs);

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Update immediately
    setCurrentTime(Date.now());

    // Set up new interval
    intervalRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pixelsPerMs, enabled]);

  return { currentTime };
}
