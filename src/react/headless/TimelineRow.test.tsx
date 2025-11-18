import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TimelineCalendar } from './TimelineCalendar';
import { TimelineItem } from './TimelineItem';
import { TimelineRow, TimelineRowGroup } from './TimelineRow';

describe('TimelineRow', () => {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe('rendering', () => {
    it('should render with children', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem startTime="2025-03-15" duration="1 week" row={0}>
              <div data-testid="event">Event</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      const event = container.querySelector('[data-testid="event"]');
      expect(event).toBeInTheDocument();
    });

    it('should support multiple rows', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRow id="row-1" rowCount={3}>
            <TimelineItem startTime="2025-03-15" duration="1 week" row={0}>
              <div data-testid="row-0">Row 0</div>
            </TimelineItem>
            <TimelineItem startTime="2025-04-15" duration="1 week" row={1}>
              <div data-testid="row-1">Row 1</div>
            </TimelineItem>
            <TimelineItem startTime="2025-05-15" duration="1 week" row={2}>
              <div data-testid="row-2">Row 2</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-testid="row-0"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="row-1"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="row-2"]')).toBeInTheDocument();
    });
  });
});

describe('TimelineRowGroup', () => {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe('rendering', () => {
    it('should render multiple TimelineRows', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRowGroup>
            <TimelineRow id="row-1" label="Row 1" rowCount={1}>
              <TimelineItem startTime="2025-03-15" duration="1 week" row={0}>
                <div data-testid="event-1">Event 1</div>
              </TimelineItem>
            </TimelineRow>
            <TimelineRow id="row-2" label="Row 2" rowCount={1}>
              <TimelineItem startTime="2025-04-15" duration="1 week" row={0}>
                <div data-testid="event-2">Event 2</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-testid="event-1"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="event-2"]')).toBeInTheDocument();
    });
  });
});
