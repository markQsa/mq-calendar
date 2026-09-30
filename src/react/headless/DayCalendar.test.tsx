import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DayCalendar, type Mechanic, type ScheduleEvent } from './DayCalendar';

const mechanics: Mechanic[] = [
  { id: 'm1', name: 'Mikko' },
  { id: 'm2', name: 'Pekka' },
];

// Monday, May 11 2026
const targetDate = new Date(2026, 4, 11);
const dayStart = new Date(2026, 4, 11).getTime();

const availability = {
  weekly: { 1: [{ start: '08:00', end: '17:00' }] },
};

describe('DayCalendar', () => {
  beforeEach(() => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it('renders mechanic headers and a time column with slot labels', () => {
    const { getByText, container } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        availability={availability}
      />
    );

    expect(getByText('Mikko')).toBeTruthy();
    expect(getByText('Pekka')).toBeTruthy();

    // 8:00 -> 17:00 with 30-min default = 18 slots; first label "08:00", last "16:30".
    expect(getByText('08:00')).toBeTruthy();
    expect(getByText('16:30')).toBeTruthy();
    expect(container.querySelector('[data-day-calendar]')).toBeTruthy();
  });

  it('uses full day when no availability is provided', () => {
    const { getByText } = render(
      <DayCalendar date={targetDate} mechanics={mechanics} />
    );
    // First and last 30-min slots over the full day.
    expect(getByText('00:00')).toBeTruthy();
    expect(getByText('23:30')).toBeTruthy();
  });

  it('renders an event in the correct mechanic column at the correct y-position', () => {
    const events: ScheduleEvent[] = [
      {
        id: 'e1',
        mechanicId: 'm1',
        startTime: dayStart + 9 * 60 * 60 * 1000, // 09:00
        endTime: dayStart + 10 * 60 * 60 * 1000, // 10:00
        title: 'Öljynvaihto',
      },
    ];

    const { getByText } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        events={events}
        availability={availability}
        slotMinutes={30}
        slotHeight={40}
      />
    );

    const eventEl = getByText('Öljynvaihto') as HTMLElement;
    // 09:00 is 1h after opening (08:00) -> 2 slots * 40px = 80px top
    expect(eventEl.style.top).toBe('80px');
    // Duration 1h = 2 slots * 40px = 80px
    expect(eventEl.style.height).toBe('80px');
  });

  it('lays out overlapping events side-by-side in the same column', () => {
    const events: ScheduleEvent[] = [
      {
        id: 'e1',
        mechanicId: 'm1',
        startTime: dayStart + 9 * 60 * 60 * 1000,
        endTime: dayStart + 11 * 60 * 60 * 1000,
        title: 'A',
      },
      {
        id: 'e2',
        mechanicId: 'm1',
        startTime: dayStart + 10 * 60 * 60 * 1000,
        endTime: dayStart + 12 * 60 * 60 * 1000,
        title: 'B',
      },
    ];

    const { getByText } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        events={events}
        availability={availability}
      />
    );

    const a = getByText('A') as HTMLElement;
    const b = getByText('B') as HTMLElement;
    // Two overlapping events -> each gets half of the column.
    expect(a.style.width).toBe('50%');
    expect(b.style.width).toBe('50%');
    expect(new Set([a.style.left, b.style.left])).toEqual(new Set(['0%', '50%']));
  });

  it('fires onSlotClick with mechanic id and slot datetime', () => {
    const onSlotClick = vi.fn();

    const { container } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        availability={availability}
        slotMinutes={30}
        slotHeight={40}
        onSlotClick={onSlotClick}
      />
    );

    // Slot divs are the only elements rendered with cursor:pointer. They render in
    // mechanic order, so the first one is the 08:00 slot of m1.
    const slots = container.querySelectorAll('div[style*="cursor: pointer"]');
    expect(slots.length).toBeGreaterThan(0);
    fireEvent.click(slots[0] as HTMLElement);

    expect(onSlotClick).toHaveBeenCalledTimes(1);
    const [mechanicId, datetime] = onSlotClick.mock.calls[0];
    expect(mechanicId).toBe('m1');
    expect((datetime as Date).getHours()).toBe(8);
    expect((datetime as Date).getMinutes()).toBe(0);
  });

  it('fires onEventClick when an event is clicked', () => {
    const onEventClick = vi.fn();
    const events: ScheduleEvent[] = [
      {
        id: 'e1',
        mechanicId: 'm1',
        startTime: dayStart + 9 * 60 * 60 * 1000,
        endTime: dayStart + 10 * 60 * 60 * 1000,
        title: 'Öljynvaihto',
      },
    ];

    const { getByText } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        events={events}
        availability={availability}
        onEventClick={onEventClick}
      />
    );

    fireEvent.click(getByText('Öljynvaihto'));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0][0]).toBe('e1');
    expect(onEventClick.mock.calls[0][1].id).toBe('e1');
  });

  it('skips events that fall completely outside the visible range', () => {
    const events: ScheduleEvent[] = [
      {
        id: 'e1',
        mechanicId: 'm1',
        startTime: dayStart + 4 * 60 * 60 * 1000, // 04:00, before opening
        endTime: dayStart + 5 * 60 * 60 * 1000, // 05:00
        title: 'Too early',
      },
    ];

    const { queryByText } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        events={events}
        availability={availability}
      />
    );

    expect(queryByText('Too early')).toBeNull();
  });

  it('shows navigation bar with prev/today/next that fire onDateChange', () => {
    const onDateChange = vi.fn();
    const { getByText, getByLabelText, container } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        availability={availability}
        showNavigation
        onDateChange={onDateChange}
        navigationLabels={{ today: 'Tänään' }}
      />
    );

    expect(container.querySelector('[data-day-calendar-navigation]')).toBeTruthy();

    fireEvent.click(getByLabelText('Previous day'));
    expect(onDateChange).toHaveBeenLastCalledWith(expect.any(Date));
    expect((onDateChange.mock.calls[0][0] as Date).getDate()).toBe(10); // 2026-05-10

    fireEvent.click(getByLabelText('Next day'));
    expect((onDateChange.mock.calls[1][0] as Date).getDate()).toBe(12); // 2026-05-12

    fireEvent.click(getByText('Tänään'));
    const todayCallArg = onDateChange.mock.calls[2][0] as Date;
    const now = new Date();
    expect(todayCallArg.getFullYear()).toBe(now.getFullYear());
    expect(todayCallArg.getMonth()).toBe(now.getMonth());
    expect(todayCallArg.getDate()).toBe(now.getDate());
  });

  it('uses custom renderEvent when provided', () => {
    const events: ScheduleEvent[] = [
      {
        id: 'e1',
        mechanicId: 'm1',
        startTime: dayStart + 9 * 60 * 60 * 1000,
        endTime: dayStart + 10 * 60 * 60 * 1000,
        title: 'Job',
      },
    ];

    const { getByText } = render(
      <DayCalendar
        date={targetDate}
        mechanics={mechanics}
        events={events}
        availability={availability}
        renderEvent={({ event, top, height }) => (
          <div data-custom-event style={{ top, height }}>
            CUSTOM-{event.title}
          </div>
        )}
      />
    );

    expect(getByText('CUSTOM-Job')).toBeTruthy();
  });

  describe('drag & drop', () => {
    const HOUR = 60 * 60 * 1000;
    // Column geometry used by the drag hit-testing: header 40px, time column
    // 60px, mechanic columns 100px wide. 30-min slots of 40px from 08:00, so
    // one pixel is 45 s and 09:00 sits 80px below the column top.
    const COLUMN_TOP = 40;
    const columnLeft: Record<string, number> = { m1: 60, m2: 160 };

    const jobEvent: ScheduleEvent = {
      id: 'e1',
      mechanicId: 'm1',
      startTime: dayStart + 9 * HOUR,
      endTime: dayStart + 10 * HOUR,
      title: 'Job',
    };

    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        const column = this.dataset.dayCalendarColumn;
        const left = column ? columnLeft[column] : undefined;
        if (left !== undefined) {
          return { left, right: left + 100, top: COLUMN_TOP, bottom: COLUMN_TOP + 720, width: 100, height: 720, x: left, y: COLUMN_TOP, toJSON: () => ({}) } as DOMRect;
        }
        // Everything else (the scroll viewport) is large enough that no drag
        // below comes near an auto-scroll edge.
        return { left: 0, right: 1000, top: 0, bottom: 1000, width: 1000, height: 1000, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const pointer = { pointerId: 1, pointerType: 'mouse', button: 0 };

    function drag(el: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
      fireEvent.pointerDown(el, { ...pointer, clientX: from.x, clientY: from.y });
      fireEvent.pointerMove(window, { ...pointer, clientX: to.x, clientY: to.y });
      fireEvent.pointerUp(window, { ...pointer, clientX: to.x, clientY: to.y });
    }

    function renderDraggable(props: Partial<React.ComponentProps<typeof DayCalendar>> = {}) {
      const onEventDrop = vi.fn();
      const onEventClick = vi.fn();
      const utils = render(
        <DayCalendar
          date={targetDate}
          mechanics={mechanics}
          events={[jobEvent]}
          availability={availability}
          draggableEvents
          onEventDrop={onEventDrop}
          onEventClick={onEventClick}
          {...props}
        />
      );
      const eventEl = utils.container.querySelector('[data-day-calendar-event="e1"]');
      if (!eventEl) throw new Error('event not rendered');
      return { ...utils, eventEl, onEventDrop, onEventClick };
    }

    it('drops an event into another column at the new time, keeping its duration', () => {
      const { eventEl, onEventDrop } = renderDraggable();

      // Grab 10px into the event, move one column right and 80px (1 h) down.
      drag(eventEl, { x: 100, y: COLUMN_TOP + 90 }, { x: 200, y: COLUMN_TOP + 170 });

      expect(onEventDrop).toHaveBeenCalledTimes(1);
      const drop = onEventDrop.mock.calls[0]?.[0];
      expect(drop.eventId).toBe('e1');
      expect(drop.mechanicId).toBe('m2');
      expect(drop.previousMechanicId).toBe('m1');
      expect(drop.startTime.getTime()).toBe(dayStart + 10 * HOUR);
      expect(drop.endTime.getTime()).toBe(dayStart + 11 * HOUR);
      expect(drop.previousStartTime.getTime()).toBe(dayStart + 9 * HOUR);
    });

    it('snaps the start time to dragSnapMinutes', () => {
      const { eventEl, onEventDrop } = renderDraggable({ dragSnapMinutes: 15 });

      // 22px down = 16.5 min → nearest 15-min boundary is 09:15.
      drag(eventEl, { x: 100, y: COLUMN_TOP + 90 }, { x: 100, y: COLUMN_TOP + 112 });

      expect(onEventDrop.mock.calls[0]?.[0].startTime.getTime()).toBe(dayStart + 9 * HOUR + 15 * 60 * 1000);
      expect(onEventDrop.mock.calls[0]?.[0].mechanicId).toBe('m1');
    });

    it('clamps the drop so the event stays inside the visible hours', () => {
      const { eventEl, onEventDrop } = renderDraggable();

      drag(eventEl, { x: 100, y: COLUMN_TOP + 90 }, { x: 100, y: COLUMN_TOP + 5000 });

      // Grid ends at 17:00; a 1 h event can start at 16:00 at the latest.
      expect(onEventDrop.mock.calls[0]?.[0].startTime.getTime()).toBe(dayStart + 16 * HOUR);
    });

    it('does not report a drop back onto the original slot', () => {
      const { eventEl, onEventDrop } = renderDraggable();

      drag(eventEl, { x: 100, y: COLUMN_TOP + 90 }, { x: 105, y: COLUMN_TOP + 95 });

      expect(onEventDrop).not.toHaveBeenCalled();
    });

    it('swallows the click that ends a drag but keeps plain clicks working', () => {
      const { eventEl, onEventDrop, onEventClick } = renderDraggable();

      drag(eventEl, { x: 100, y: COLUMN_TOP + 90 }, { x: 200, y: COLUMN_TOP + 170 });
      fireEvent.click(eventEl);
      expect(onEventClick).not.toHaveBeenCalled();

      // A press below the drag threshold is a click, not a drag.
      fireEvent.pointerDown(eventEl, { ...pointer, clientX: 100, clientY: COLUMN_TOP + 90 });
      fireEvent.pointerMove(window, { ...pointer, clientX: 102, clientY: COLUMN_TOP + 91 });
      fireEvent.pointerUp(window, { ...pointer, clientX: 102, clientY: COLUMN_TOP + 91 });
      fireEvent.click(eventEl);
      expect(onEventClick).toHaveBeenCalledTimes(1);
      expect(onEventDrop).toHaveBeenCalledTimes(1);
    });

    it('rejects columns refused by canDropEvent', () => {
      const canDropEvent = vi.fn((_event: ScheduleEvent, mechanicId: string) => mechanicId !== 'm2');
      const { eventEl, container, onEventDrop } = renderDraggable({ canDropEvent });

      fireEvent.pointerDown(eventEl, { ...pointer, clientX: 100, clientY: COLUMN_TOP + 90 });
      fireEvent.pointerMove(window, { ...pointer, clientX: 200, clientY: COLUMN_TOP + 170 });
      expect(container.querySelector('[data-day-calendar-drag-preview]')).toBeNull();
      fireEvent.pointerUp(window, { ...pointer, clientX: 200, clientY: COLUMN_TOP + 170 });

      expect(canDropEvent).toHaveBeenCalledWith(jobEvent, 'm2');
      expect(onEventDrop).not.toHaveBeenCalled();
    });

    it('does not drag events excluded by the draggableEvents predicate', () => {
      const { eventEl, onEventDrop } = renderDraggable({ draggableEvents: () => false });

      drag(eventEl, { x: 100, y: COLUMN_TOP + 90 }, { x: 200, y: COLUMN_TOP + 170 });

      expect(onEventDrop).not.toHaveBeenCalled();
    });

    it('cancels the drag on Escape', () => {
      const { eventEl, container, onEventDrop } = renderDraggable();

      fireEvent.pointerDown(eventEl, { ...pointer, clientX: 100, clientY: COLUMN_TOP + 90 });
      fireEvent.pointerMove(window, { ...pointer, clientX: 200, clientY: COLUMN_TOP + 170 });
      expect(container.querySelector('[data-day-calendar-drag-preview="e1"]')).not.toBeNull();
      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.pointerUp(window, { ...pointer, clientX: 200, clientY: COLUMN_TOP + 170 });

      expect(container.querySelector('[data-day-calendar-drag-preview]')).toBeNull();
      expect(onEventDrop).not.toHaveBeenCalled();
    });

    it('renders the preview through renderEvent with drag flags', () => {
      const renderEvent = vi.fn(({ event, isDragPreview, isDragging, draggable }: {
        event: ScheduleEvent; isDragPreview: boolean; isDragging: boolean; draggable: boolean;
      }) => (
        <div data-flags={`${String(draggable)}-${String(isDragging)}-${String(isDragPreview)}`}>{event.title}</div>
      ));
      const { eventEl, container } = renderDraggable({ renderEvent });

      expect(container.querySelector('[data-flags="true-false-false"]')).not.toBeNull();

      fireEvent.pointerDown(eventEl.firstElementChild ?? eventEl, { ...pointer, clientX: 100, clientY: COLUMN_TOP + 90 });
      fireEvent.pointerMove(window, { ...pointer, clientX: 200, clientY: COLUMN_TOP + 170 });

      // Original stays in place marked as dragging; the preview is in m2.
      expect(container.querySelector('[data-day-calendar-column="m1"] [data-flags="true-true-false"]')).not.toBeNull();
      expect(container.querySelector('[data-day-calendar-column="m2"] [data-flags="true-false-true"]')).not.toBeNull();

      fireEvent.pointerUp(window, { ...pointer, clientX: 200, clientY: COLUMN_TOP + 170 });
    });
  });
});
