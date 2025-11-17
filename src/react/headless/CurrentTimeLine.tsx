import React from 'react';
import type { TimelineStyles } from '../types';

export interface CurrentTimeLineProps {
  /** Current time timestamp */
  currentTime: number;
  /** Start timestamp of the viewport */
  viewportStart: number;
  /** Pixels per millisecond for positioning */
  pixelsPerMs: number;
  /** Line width in pixels (default: 2) */
  lineWidth?: number;
  /** Custom styles */
  styles?: TimelineStyles;
}

/**
 * Current time line component - vertical line showing current time
 */
export const CurrentTimeLine: React.FC<CurrentTimeLineProps> = ({
  currentTime,
  viewportStart,
  pixelsPerMs,
  lineWidth = 2,
  styles = {}
}) => {
  // Calculate position of current time line
  const position = (currentTime - viewportStart) * pixelsPerMs;

  // Calculate marker position based on line width
  const markerSize = Math.max(8, lineWidth * 2);
  const markerOffset = -(markerSize / 2);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position}px`,
        top: 0,
        bottom: 0,
        width: `${lineWidth}px`,
        background: 'var(--timeline-current-time-line, #ff4444)',
        zIndex: 100,
        pointerEvents: 'none',
        ...styles.root
      }}
      data-timeline-current-time
    >
      {/* Optional: Add a small circle or marker at the top */}
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          left: `${markerOffset}px`,
          width: `${markerSize}px`,
          height: `${markerSize}px`,
          borderRadius: '50%',
          background: 'var(--timeline-current-time-line, #ff4444)',
          border: '2px solid var(--timeline-bg, #ffffff)'
        }}
      />
    </div>
  );
};
