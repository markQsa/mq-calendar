import React from 'react';
import type { TimelineStyles } from '../types';

export interface CurrentTimeLineProps {
  /** Current time timestamp */
  currentTime: number;
  /** Start timestamp of the viewport */
  viewportStart: number;
  /** Pixels per millisecond for positioning */
  pixelsPerMs: number;
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
  styles = {}
}) => {
  // Calculate position of current time line
  const position = (currentTime - viewportStart) * pixelsPerMs;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position}px`,
        top: 0,
        bottom: 0,
        width: '2px',
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
          left: '-3px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--timeline-current-time-line, #ff4444)',
          border: '2px solid var(--timeline-bg, #ffffff)'
        }}
      />
    </div>
  );
};
