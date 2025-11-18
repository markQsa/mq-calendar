import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TimelineCalendar } from './TimelineCalendar';
import { TimelineItem } from './TimelineItem';
import { TimelineRow } from './TimelineRow';

describe('TimelineItem', () => {
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
              <div data-testid="event">My Event</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      const event = container.querySelector('[data-testid="event"]');
      expect(event).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem
              startTime="2025-03-15"
              duration="1 week"
              row={0}
              className="custom-item"
            >
              <div>Event</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      const item = container.querySelector('.custom-item');
      expect(item).toBeInTheDocument();
    });
  });

  describe('time positioning', () => {
    it('should accept Date object for startTime', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem
              startTime={new Date('2025-03-15')}
              duration="1 week"
              row={0}
            >
              <div data-testid="event">Event</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-testid="event"]')).toBeInTheDocument();
    });

    it('should accept ISO string for startTime', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem
              startTime="2025-03-15T10:00:00Z"
              duration="1 week"
              row={0}
            >
              <div data-testid="event">Event</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-testid="event"]')).toBeInTheDocument();
    });

    it('should accept human-readable duration', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
          <TimelineRow id="row-1" rowCount={1}>
            <TimelineItem startTime="2025-03-15" duration="3 days" row={0}>
              <div data-testid="event">Event</div>
            </TimelineItem>
          </TimelineRow>
        </TimelineCalendar>
      );

      expect(container.querySelector('[data-testid="event"]')).toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    it('should not be draggable by default', () => {
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
      const parent = event?.parentElement;
      expect(parent).not.toHaveStyle({ cursor: 'grab' });
    });

    it('should show grab cursor when draggable', () => {
      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
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
        </TimelineCalendar>
      );

      const event = container.querySelector('[data-testid="event"]');
      const parent = event?.parentElement;
      expect(parent).toHaveStyle({ cursor: 'grab' });
    });

    it('should call onDragEnd when drag completes', () => {
      const onDragEnd = vi.fn();

      const { container } = render(
        <TimelineCalendar startDate={startDate} endDate={endDate}>
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
        </TimelineCalendar>
      );

      const event = container.querySelector('[data-testid="event"]');
      const item = event?.parentElement!;

      // Perform drag
      fireEvent.mouseDown(item, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 100 });
      fireEvent.mouseUp(document);

      expect(onDragEnd).toHaveBeenCalled();
    });
  });
});
