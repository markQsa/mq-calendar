import React, { useMemo } from 'react';
import type { AvailabilityConfig } from '../types';
import { useTimelineContext } from './TimelineContext';
import { calculateAvailableRanges } from '../../utils/availabilityUtils';

export interface AvailabilityOverlayProps {
  /** Availability configuration */
  config: AvailabilityConfig;
}

/**
 * Component that renders availability overlay showing available/unavailable time periods
 */
export const AvailabilityOverlay: React.FC<AvailabilityOverlayProps> = ({ config }) => {
  const { engine, refreshCounter } = useTimelineContext();

  const { availableRanges, viewport, shouldShow } = useMemo(() => {
    if (!engine) {
      return { availableRanges: [], viewport: { start: 0, end: 0 }, shouldShow: false };
    }

    const viewport = engine.getViewportState();
    const zoomState = engine.getZoomState();

    // Calculate viewport duration in days
    const viewportDurationMs = viewport.end - viewport.start;
    const viewportDurationDays = viewportDurationMs / (1000 * 60 * 60 * 24);

    // Only show availability when viewing 60 days or less (roughly 2 months)
    // This means days are clearly visible on the timeline
    const shouldShow = viewportDurationDays <= 60;

    if (!shouldShow) {
      return { availableRanges: [], viewport, shouldShow: false };
    }

    // Calculate granularity based on zoom level (more granular when zoomed in)
    const granularity = Math.max(60000, Math.floor(1 / zoomState.pixelsPerMs)); // At least 1 minute

    const ranges = calculateAvailableRanges(viewport.start, viewport.end, config, granularity);

    return { availableRanges: ranges, viewport, shouldShow: true };
  }, [engine, config, refreshCounter]);

  if (!engine || config.showOverlay === false || !shouldShow) {
    return null;
  }

  const defaultAvailableStyle: React.CSSProperties = {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // Green tint
    pointerEvents: 'none',
    ...config.availableStyle
  };

  const defaultUnavailableStyle: React.CSSProperties = {
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red tint
    pointerEvents: 'none',
    ...config.unavailableStyle
  };

  // Create unavailable ranges (gaps between available ranges)
  const unavailableRanges: Array<[number, number]> = [];

  if (availableRanges.length === 0) {
    // Entire viewport is unavailable
    unavailableRanges.push([viewport.start, viewport.end]);
  } else {
    // Add range before first available period
    if (availableRanges[0][0] > viewport.start) {
      unavailableRanges.push([viewport.start, availableRanges[0][0]]);
    }

    // Add gaps between available ranges
    for (let i = 0; i < availableRanges.length - 1; i++) {
      unavailableRanges.push([availableRanges[i][1], availableRanges[i + 1][0]]);
    }

    // Add range after last available period
    const lastRange = availableRanges[availableRanges.length - 1];
    if (lastRange[1] < viewport.end) {
      unavailableRanges.push([lastRange[1], viewport.end]);
    }
  }

  return (
    <>
      {/* Render unavailable periods */}
      {unavailableRanges.map(([start, end], index) => {
        const left = engine.timeToPixel(start);
        const right = engine.timeToPixel(end);
        const width = right - left;

        return (
          <div
            key={`unavailable-${index}`}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width,
              height: '100%',
              zIndex: 0,
              ...defaultUnavailableStyle
            }}
            data-availability-overlay
            data-type="unavailable"
          />
        );
      })}

      {/* Render available periods (optional, for styling) */}
      {config.availableStyle && availableRanges.map(([start, end], index) => {
        const left = engine.timeToPixel(start);
        const right = engine.timeToPixel(end);
        const width = right - left;

        return (
          <div
            key={`available-${index}`}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width,
              height: '100%',
              zIndex: 0,
              ...defaultAvailableStyle
            }}
            data-availability-overlay
            data-type="available"
          />
        );
      })}
    </>
  );
};
