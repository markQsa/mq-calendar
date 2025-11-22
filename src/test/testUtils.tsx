import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TimelineCalendar } from '../react/headless/TimelineCalendar';
import { TimelineRowGroup } from '../react/headless/TimelineRow';

/**
 * Render timeline with proper setup for testing
 * Ensures items are visible in the viewport
 */
export function renderTimeline(
  ui: React.ReactElement,
  options?: RenderOptions & {
    startDate?: Date;
    endDate?: Date;
    width?: string;
    height?: string;
  }
) {
  const {
    startDate = new Date('2025-01-01'),
    endDate = new Date('2025-12-31'),
    width = '1000px',
    height = '600px',
    ...renderOptions
  } = options || {};

  return render(
    <TimelineCalendar
      startDate={startDate}
      endDate={endDate}
      width={width}
      height={height}
    >
      <TimelineRowGroup>
        {ui}
      </TimelineRowGroup>
    </TimelineCalendar>,
    renderOptions
  );
}

/**
 * Test dates that are guaranteed to be in the middle of a yearly timeline
 * Using mid-June as it's central to the year
 */
export const TEST_DATES = {
  mid: '2025-06-15',
  start: '2025-06-01',
  end: '2025-06-30',
} as const;
