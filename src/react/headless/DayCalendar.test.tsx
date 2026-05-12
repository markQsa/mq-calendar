import { describe, it, expect, vi, beforeEach } from 'vitest';
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
});
