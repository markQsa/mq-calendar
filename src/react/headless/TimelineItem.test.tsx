import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TimelineCalendar } from './TimelineCalendar';
import { TimelineItem } from './TimelineItem';
import { TimelineRow, TimelineRowGroup } from './TimelineRow';

describe('TimelineItem', () => {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  // Use dates in middle of year (center of viewport) to ensure visibility
  // Viewport centers on (start + end) / 2 = ~July 1st
  const testDate = '2025-07-01';

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe('rendering', () => {
    it('should render with children', async () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem startTime={testDate} duration="1 week" row={0}>
                <div data-testid="event">My Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      // Wait for component to render items
      await waitFor(() => {
        const event = container.querySelector('[data-testid="event"]');
        expect(event).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem
                startTime={testDate}
                duration="1 week"
                row={0}
                className="custom-item"
              >
                <div>Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      await waitFor(() => {
        const item = container.querySelector('.custom-item');
        expect(item).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('time positioning', () => {
    it('should accept Date object for startTime', async () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem
                startTime={new Date(testDate)}
                duration="1 week"
                row={0}
              >
                <div data-testid="event">Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="event"]')).toBeInTheDocument();
      });
    });

    it('should accept ISO string for startTime', async () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem
                startTime={testDate + 'T10:00:00Z'}
                duration="1 week"
                row={0}
              >
                <div data-testid="event">Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="event"]')).toBeInTheDocument();
      });
    });

    it('should accept human-readable duration', async () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem startTime={testDate} duration="3 days" row={0}>
                <div data-testid="event">Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="event"]')).toBeInTheDocument();
      });
    });
  });

  describe('drag and drop', () => {
    it('should not be draggable by default', async () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem startTime={testDate} duration="1 week" row={0}>
                <div data-testid="event">Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      await waitFor(() => {
        const event = container.querySelector('[data-testid="event"]');
        const parent = event?.parentElement;
        expect(parent).not.toHaveStyle({ cursor: 'grab' });
      });
    });

    it('should show grab cursor when draggable', async () => {
      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem
                startTime="2025-03-15"
                duration="1 week"
                row={0}
                draggable={true}
              >
                <div data-testid="event">Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      await waitFor(() => {
        const event = container.querySelector('[data-testid="event"]');
        const parent = event?.parentElement;
        expect(parent).toHaveStyle({ cursor: 'grab' });
      }, { timeout: 3000 });
    });

    it('should call onDragEnd when drag completes', async () => {
      const onDragEnd = vi.fn();

      const { container } = render(
        <TimelineCalendar
          startDate={startDate}
          endDate={endDate}
          width="1000px"
          height="600px"
        >
          <TimelineRowGroup>
            <TimelineRow id="row-1" rowCount={1}>
              <TimelineItem
                startTime="2025-03-15"
                duration="1 week"
                row={0}
                draggable={true}
                onDragEnd={onDragEnd}
              >
                <div data-testid="event">Event</div>
              </TimelineItem>
            </TimelineRow>
          </TimelineRowGroup>
        </TimelineCalendar>
      );

      await waitFor(() => {
        const event = container.querySelector('[data-testid="event"]');
        expect(event).toBeInTheDocument();
      }, { timeout: 3000 });

      const event = container.querySelector('[data-testid="event"]');
      const item = event?.parentElement!;

      // Perform drag - need to move more than threshold (5px)
      fireEvent.mouseDown(item, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
      fireEvent.mouseUp(document);

      expect(onDragEnd).toHaveBeenCalled();
    });
  });
});
