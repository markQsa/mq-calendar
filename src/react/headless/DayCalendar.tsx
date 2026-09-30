import React, { CSSProperties, ReactNode, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import type { TimelineTheme, AvailabilityConfig } from '../types';
import type { TimeValue } from '../../utils/timeTypes';
import type { CalendarLocale } from '../../utils/locales';
import { toTimestamp } from '../../utils/timeConverter';
import { themes } from '../themes';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { assignSubRows, type TimeRangeItem } from '../../utils/overlapDetection';
import { openingHoursRangeForDate } from '../../utils/openingHoursRange';

const MS_PER_MINUTE = 60 * 1000;
/** Pointer travel (px) before a press on an event turns into a drag. */
const DRAG_THRESHOLD_PX = 4;
/** Distance (px) from the scroll viewport edge at which a drag auto-scrolls. */
const AUTO_SCROLL_EDGE_PX = 40;
/** Maximum auto-scroll speed (px per frame) right at the viewport edge. */
const AUTO_SCROLL_MAX_SPEED_PX = 16;

export interface Mechanic {
  id: string;
  name: string;
  color?: string;
}

export interface ScheduleEvent {
  id: string;
  mechanicId: string;
  startTime: TimeValue;
  endTime: TimeValue;
  title?: string;
  color?: string;
  data?: unknown;
}

export interface DayCalendarRenderEventParams {
  event: ScheduleEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  /** True when this event can be dragged (see `draggableEvents`). */
  draggable: boolean;
  /** True for the event's original position while it is being dragged. */
  isDragging: boolean;
  /**
   * True for the drag preview rendered at the pointer's drop target. The
   * preview is rendered with `pointer-events: none` inside the target column.
   */
  isDragPreview: boolean;
}

/** Payload of `onEventDrop` — where a dragged event was dropped. */
export interface DayCalendarEventDrop {
  eventId: string;
  event: ScheduleEvent;
  /** Column the event was dropped into. */
  mechanicId: string;
  /** Column the event was dragged from. */
  previousMechanicId: string;
  /** New start, snapped to `dragSnapMinutes`. Duration is preserved. */
  startTime: Date;
  endTime: Date;
  previousStartTime: Date;
}

export interface DayCalendarClassNames {
  root?: string;
  navigation?: string;
  navigationButton?: string;
  navigationLabel?: string;
  header?: string;
  headerCell?: string;
  timeColumn?: string;
  timeLabel?: string;
  mechanicColumn?: string;
  slot?: string;
  event?: string;
  dragPreview?: string;
  currentTimeLine?: string;
}

export interface DayCalendarStyles {
  root?: CSSProperties;
  navigation?: CSSProperties;
  navigationButton?: CSSProperties;
  navigationLabel?: CSSProperties;
  header?: CSSProperties;
  headerCell?: CSSProperties;
  timeColumn?: CSSProperties;
  timeLabel?: CSSProperties;
  mechanicColumn?: CSSProperties;
  slot?: CSSProperties;
  event?: CSSProperties;
  dragPreview?: CSSProperties;
  currentTimeLine?: CSSProperties;
}

export interface DayCalendarNavigationLabels {
  /** Previous-day button label/icon (default: ←) */
  previous?: ReactNode;
  /** Today button label (default: 'Today') */
  today?: ReactNode;
  /** Next-day button label/icon (default: →) */
  next?: ReactNode;
}

export interface DayCalendarProps {
  /** Target day to display */
  date: TimeValue;
  /** Mechanics shown as columns */
  mechanics: Mechanic[];
  /** Events to display */
  events?: ScheduleEvent[];
  /** Availability config — determines visible hour range for the day */
  availability?: AvailabilityConfig;
  /** Slot granularity in minutes (default: 30) */
  slotMinutes?: number;
  /** Container width (default: 100%) */
  width?: number | string;
  /** Container height (default: 600px) */
  height?: number | string;
  /** Time column width in px (default: 60) */
  timeColumnWidth?: number;
  /** Slot row height in px (default: 40) */
  slotHeight?: number;
  /** Minimum mechanic column width in px (default: 100) */
  minColumnWidth?: number;
  /** Theme preset or custom theme */
  theme?: 'light' | 'dark' | 'compact' | 'compact-dark' | TimelineTheme;
  /** Locale (reserved for future header date formatting) */
  locale?: CalendarLocale;
  /** Show current-time line (default: false) */
  showCurrentTime?: boolean;
  /** Show prev/today/next navigation bar (default: false). Requires `onDateChange`. */
  showNavigation?: boolean;
  /** Optional labels for the navigation buttons */
  navigationLabels?: DayCalendarNavigationLabels;
  /** Called when the user clicks prev / today / next. Component is controlled — wire this to state. */
  onDateChange?: (newDate: Date) => void;
  /** Custom renderer for the date label in the navigation bar */
  renderDateLabel?: (date: Date) => ReactNode;
  /** Click handler for an empty slot — datetime snapped to slot start */
  onSlotClick?: (mechanicId: string, datetime: Date) => void;
  /** Click handler for an event */
  onEventClick?: (eventId: string, event: ScheduleEvent) => void;
  /** Custom event renderer */
  renderEvent?: (params: DayCalendarRenderEventParams) => ReactNode;
  /**
   * Enable drag & drop of events across time and mechanic columns.
   * `true` makes every event draggable; a function decides per event.
   * Has no effect without `onEventDrop` (default: false).
   */
  draggableEvents?: boolean | ((event: ScheduleEvent) => boolean);
  /** Snap granularity in minutes for dragged start times (default: `slotMinutes`) */
  dragSnapMinutes?: number;
  /**
   * Whether a dragged event may be dropped into a column. A rejected column
   * shows no preview and a drop there cancels the drag (default: all columns).
   */
  canDropEvent?: (event: ScheduleEvent, mechanicId: string) => boolean;
  /**
   * Called when a drag ends on an allowed column with a different mechanic or
   * start time. The component stays controlled — update `events` to move it.
   * A click that ends a drag does not fire `onEventClick`.
   */
  onEventDrop?: (drop: DayCalendarEventDrop) => void;
  /** Custom mechanic header renderer */
  renderMechanicHeader?: (mechanic: Mechanic) => ReactNode;
  /** Custom time label renderer */
  renderTimeLabel?: (time: Date) => ReactNode;
  /** Class names */
  classNames?: DayCalendarClassNames;
  /** Inline styles */
  styles?: DayCalendarStyles;
}

interface DragPreview {
  event: ScheduleEvent;
  /** Column the pointer is over, or null when that column rejects the drop. */
  mechanicId: string | null;
  startMs: number;
}

interface DragSession {
  event: ScheduleEvent;
  originMechanicId: string;
  originStartMs: number;
  durationMs: number;
  /** Pointer position inside the event, as ms after the event start. */
  grabOffsetMs: number;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  started: boolean;
  target: DragPreview | null;
}

interface LaidOutEvent {
  event: ScheduleEvent;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatHHmm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function defaultEventStyle(event: ScheduleEvent, mechanic: Mechanic): CSSProperties {
  return {
    position: 'absolute',
    background: event.color || mechanic.color || '#3b82f6',
    color: 'white',
    boxSizing: 'border-box',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    userSelect: 'none',
  };
}

function localMidnight(timestamp: number): number {
  const d = new Date(timestamp);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Vertical day-view calendar with mechanic columns.
 *
 * Times run on the Y axis, constrained to opening hours derived from
 * `availability`. Mechanics are columns. Events are absolute-positioned
 * inside their mechanic column; overlapping events lay out side-by-side via
 * `assignSubRows`.
 */
export const DayCalendar: React.FC<DayCalendarProps> = ({
  date,
  mechanics,
  events = [],
  availability,
  slotMinutes = 30,
  width = '100%',
  height = '600px',
  timeColumnWidth = 60,
  slotHeight = 40,
  minColumnWidth = 100,
  theme = 'light',
  locale,
  showCurrentTime = false,
  showNavigation = false,
  navigationLabels,
  onDateChange,
  renderDateLabel,
  onSlotClick,
  onEventClick,
  renderEvent,
  draggableEvents = false,
  dragSnapMinutes,
  canDropEvent,
  onEventDrop,
  renderMechanicHeader,
  renderTimeLabel,
  classNames = {},
  styles = {},
}) => {
  const dateTimestamp = useMemo(() => toTimestamp(date), [date]);
  const dayStart = useMemo(() => localMidnight(dateTimestamp), [dateTimestamp]);
  const targetDate = useMemo(() => new Date(dayStart), [dayStart]);

  const resolvedTheme = useMemo<TimelineTheme>(() => {
    if (typeof theme === 'string') return themes[theme] || themes.light;
    return theme;
  }, [theme]);

  // Opening-hours range, snapped to slot boundaries.
  const { startMinutes: rawStart, endMinutes: rawEnd } = useMemo(
    () => openingHoursRangeForDate(targetDate, availability),
    [targetDate, availability]
  );

  const gridStartMinutes = Math.floor(rawStart / slotMinutes) * slotMinutes;
  const gridEndMinutes = Math.max(
    gridStartMinutes + slotMinutes,
    Math.ceil(rawEnd / slotMinutes) * slotMinutes
  );
  const slotCount = Math.max(1, (gridEndMinutes - gridStartMinutes) / slotMinutes);
  const bodyHeight = slotCount * slotHeight;
  const visibleStartMs = dayStart + gridStartMinutes * MS_PER_MINUTE;
  const visibleEndMs = dayStart + gridEndMinutes * MS_PER_MINUTE;
  const slotMs = slotMinutes * MS_PER_MINUTE;

  // Group events by mechanic and compute layout (sub-columns for overlaps).
  const eventsByMechanic = useMemo(() => {
    const byMech = new Map<string, LaidOutEvent[]>();
    for (const m of mechanics) byMech.set(m.id, []);

    // Group events for each mechanic, only those that overlap the visible range.
    const itemsByMech = new Map<string, Array<{ item: TimeRangeItem; event: ScheduleEvent }>>();
    for (const m of mechanics) itemsByMech.set(m.id, []);

    for (const event of events) {
      const bucket = itemsByMech.get(event.mechanicId);
      if (!bucket) continue;
      const startMs = toTimestamp(event.startTime);
      const endMs = toTimestamp(event.endTime);
      if (endMs <= visibleStartMs || startMs >= visibleEndMs) continue;
      bucket.push({ item: { id: event.id, startTime: startMs, endTime: endMs }, event });
    }

    for (const [mechanicId, bucket] of itemsByMech) {
      if (bucket.length === 0) continue;
      const assignments = assignSubRows(bucket.map(b => b.item));
      const laidOut: LaidOutEvent[] = [];
      for (const { item, event } of bucket) {
        const a = assignments.get(item.id);
        if (!a) continue;
        const clippedStart = Math.max(item.startTime, visibleStartMs);
        const clippedEnd = Math.min(item.endTime, visibleEndMs);
        const top = ((clippedStart - visibleStartMs) / slotMs) * slotHeight;
        const height = Math.max(
          slotHeight / 4,
          ((clippedEnd - clippedStart) / slotMs) * slotHeight
        );
        const widthPct = 100 / a.subRowCount;
        const leftPct = a.subRow * widthPct;
        laidOut.push({ event, top, height, leftPct, widthPct });
      }
      byMech.set(mechanicId, laidOut);
    }
    return byMech;
  }, [mechanics, events, visibleStartMs, visibleEndMs, slotMs, slotHeight]);

  // Slot time labels (one per slot row).
  const slotTimes = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < slotCount; i++) {
      arr.push(new Date(visibleStartMs + i * slotMs));
    }
    return arr;
  }, [slotCount, visibleStartMs, slotMs]);

  // Current-time line: refresh every minute when enabled.
  const { currentTime } = useCurrentTime({
    pixelsPerMs: slotHeight / slotMs,
    enabled: showCurrentTime,
  });
  const currentTimeOnDay =
    showCurrentTime && currentTime >= visibleStartMs && currentTime <= visibleEndMs;
  const currentTimeTop = currentTimeOnDay
    ? ((currentTime - visibleStartMs) / slotMs) * slotHeight
    : 0;

  const handleSlotClick = useCallback(
    (mechanicId: string, slotIndex: number) => {
      if (!onSlotClick) return;
      const slotMsAbsolute = visibleStartMs + slotIndex * slotMs;
      onSlotClick(mechanicId, new Date(slotMsAbsolute));
    },
    [onSlotClick, visibleStartMs, slotMs]
  );

  const handleEventClick = useCallback(
    (event: ScheduleEvent, e: React.MouseEvent) => {
      if (!onEventClick) return;
      e.stopPropagation();
      onEventClick(event.id, event);
    },
    [onEventClick]
  );

  const headerHeightPx = 40;

  // --- Drag & drop ---------------------------------------------------------
  // The press is tracked on window listeners so the pointer can leave the
  // event (and the column) mid-drag. Geometry is read from the DOM on every
  // move, so scrolling and resizing during a drag need no bookkeeping.
  const dragEnabled = Boolean(onEventDrop) && draggableEvents !== false;
  const isEventDraggable = useCallback(
    (event: ScheduleEvent): boolean => {
      if (!dragEnabled) return false;
      return typeof draggableEvents === 'function' ? draggableEvents(event) : true;
    },
    [dragEnabled, draggableEvents]
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<DragSession | null>(null);
  const detachDragRef = useRef<(() => void) | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const snapMs = Math.max(1, dragSnapMinutes ?? slotMinutes) * MS_PER_MINUTE;
  const pixelsPerMs = slotHeight / slotMs;

  // Latest values for the window listeners, which live for a whole drag.
  const dragEnv = useRef({
    mechanics, dayStart, visibleStartMs, visibleEndMs, pixelsPerMs, snapMs, canDropEvent, onEventDrop,
  });
  dragEnv.current = {
    mechanics, dayStart, visibleStartMs, visibleEndMs, pixelsPerMs, snapMs, canDropEvent, onEventDrop,
  };

  /** Resolve the drop target under a pointer position. */
  const resolveTarget = useCallback((session: DragSession, clientX: number, clientY: number): DragPreview => {
    const env = dragEnv.current;
    let mechanicId: string | null = null;
    let columnTop = 0;
    let nearestDistance = Infinity;
    // Nearest column horizontally, so dragging past the outermost column
    // still targets it instead of dropping nothing.
    for (const mechanic of env.mechanics) {
      const el = columnRefs.current.get(mechanic.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const distance = clientX < rect.left ? rect.left - clientX : clientX >= rect.right ? clientX - rect.right : 0;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        mechanicId = mechanic.id;
        columnTop = rect.top;
      }
    }

    const rawStart = env.visibleStartMs + (clientY - columnTop) / env.pixelsPerMs - session.grabOffsetMs;
    let startMs = env.dayStart + Math.round((rawStart - env.dayStart) / env.snapMs) * env.snapMs;
    const latestStart = env.visibleEndMs - Math.min(session.durationMs, env.visibleEndMs - env.visibleStartMs);
    startMs = Math.max(env.visibleStartMs, Math.min(startMs, latestStart));

    if (mechanicId !== null && env.canDropEvent && !env.canDropEvent(session.event, mechanicId)) {
      mechanicId = null;
    }
    return { event: session.event, mechanicId, startMs };
  }, []);

  const updateTarget = useCallback((session: DragSession) => {
    const target = resolveTarget(session, session.lastX, session.lastY);
    const prev = session.target;
    if (prev && prev.mechanicId === target.mechanicId && prev.startMs === target.startMs) return;
    session.target = target;
    setDragPreview(target);
  }, [resolveTarget]);

  const endDrag = useCallback((commit: boolean) => {
    const session = dragRef.current;
    detachDragRef.current?.();
    detachDragRef.current = null;
    dragRef.current = null;
    if (!session?.started) return;
    setDragPreview(null);

    // The click that follows pointerup must not open the event.
    const swallowClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener('click', swallowClick, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);

    const target = session.target;
    const onDrop = dragEnv.current.onEventDrop;
    if (!commit || !target || target.mechanicId === null || !onDrop) return;
    if (target.mechanicId === session.originMechanicId && target.startMs === session.originStartMs) return;
    onDrop({
      eventId: session.event.id,
      event: session.event,
      mechanicId: target.mechanicId,
      previousMechanicId: session.originMechanicId,
      startTime: new Date(target.startMs),
      endTime: new Date(target.startMs + session.durationMs),
      previousStartTime: new Date(session.originStartMs),
    });
  }, []);

  // Abort a drag if the component unmounts mid-gesture.
  useEffect(() => () => {
    detachDragRef.current?.();
  }, []);

  const handleEventPointerDown = useCallback(
    (event: ScheduleEvent, mechanicId: string, e: React.PointerEvent) => {
      if (!isEventDraggable(event) || dragRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const column = columnRefs.current.get(mechanicId);
      if (!column) return;

      const env = dragEnv.current;
      const originStartMs = toTimestamp(event.startTime);
      const durationMs = Math.max(0, toTimestamp(event.endTime) - originStartMs);
      const pointerMs = env.visibleStartMs + (e.clientY - column.getBoundingClientRect().top) / env.pixelsPerMs;
      const session: DragSession = {
        event,
        originMechanicId: mechanicId,
        originStartMs,
        durationMs,
        grabOffsetMs: pointerMs - originStartMs,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        started: false,
        target: null,
      };
      dragRef.current = session;

      let frame: number | null = null;
      const autoScroll = () => {
        frame = null;
        const current = dragRef.current;
        const scroller = scrollRef.current;
        if (!current?.started || !scroller) return;
        const rect = scroller.getBoundingClientRect();
        const speed = (distance: number) =>
          Math.ceil(((AUTO_SCROLL_EDGE_PX - distance) / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_SPEED_PX);
        let dy = 0;
        let dx = 0;
        // The sticky header covers the top of the viewport.
        const top = rect.top + headerHeightPx;
        if (current.lastY < top + AUTO_SCROLL_EDGE_PX) dy = -speed(Math.max(0, current.lastY - top));
        else if (current.lastY > rect.bottom - AUTO_SCROLL_EDGE_PX) dy = speed(Math.max(0, rect.bottom - current.lastY));
        if (current.lastX < rect.left + AUTO_SCROLL_EDGE_PX) dx = -speed(Math.max(0, current.lastX - rect.left));
        else if (current.lastX > rect.right - AUTO_SCROLL_EDGE_PX) dx = speed(Math.max(0, rect.right - current.lastX));
        if (dx === 0 && dy === 0) return;
        const beforeTop = scroller.scrollTop;
        const beforeLeft = scroller.scrollLeft;
        scroller.scrollTop += dy;
        scroller.scrollLeft += dx;
        if (scroller.scrollTop === beforeTop && scroller.scrollLeft === beforeLeft) return;
        updateTarget(current);
        frame = requestAnimationFrame(autoScroll);
      };

      const onMove = (moveEvent: PointerEvent) => {
        const current = dragRef.current;
        if (!current || moveEvent.pointerId !== current.pointerId) return;
        current.lastX = moveEvent.clientX;
        current.lastY = moveEvent.clientY;
        if (!current.started) {
          const dx = Math.abs(moveEvent.clientX - current.startX);
          const dy = Math.abs(moveEvent.clientY - current.startY);
          if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return;
          current.started = true;
        }
        moveEvent.preventDefault();
        updateTarget(current);
        if (frame === null) frame = requestAnimationFrame(autoScroll);
      };
      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== dragRef.current?.pointerId) return;
        endDrag(true);
      };
      const onCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId !== dragRef.current?.pointerId) return;
        endDrag(false);
      };
      const onKey = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === 'Escape') endDrag(false);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey);
      detachDragRef.current = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey);
      };
    },
    [isEventDraggable, updateTarget, endDrag]
  );

  const setColumnRef = useCallback((mechanicId: string, el: HTMLDivElement | null) => {
    if (el) columnRefs.current.set(mechanicId, el);
    else columnRefs.current.delete(mechanicId);
  }, []);

  const handlePrevDay = useCallback(() => {
    if (!onDateChange) return;
    const d = new Date(dayStart);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  }, [onDateChange, dayStart]);

  const handleToday = useCallback(() => {
    if (!onDateChange) return;
    const now = new Date();
    onDateChange(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, [onDateChange]);

  const handleNextDay = useCallback(() => {
    if (!onDateChange) return;
    const d = new Date(dayStart);
    d.setDate(d.getDate() + 1);
    onDateChange(d);
  }, [onDateChange, dayStart]);

  const dateLabel = useMemo<ReactNode>(() => {
    if (renderDateLabel) return renderDateLabel(targetDate);
    if (locale) {
      const weekday = locale.weekdaysFull[targetDate.getDay()] ?? '';
      const month = locale.monthsFull[targetDate.getMonth()] ?? '';
      return `${weekday} ${targetDate.getDate()}. ${month} ${targetDate.getFullYear()}`.trim();
    }
    return targetDate.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [renderDateLabel, targetDate, locale]);

  const colors = resolvedTheme.colors ?? {};
  const fonts = resolvedTheme.fonts ?? {};
  const cssVars: CSSProperties = {
    '--day-calendar-bg': colors.background || '#ffffff',
    '--day-calendar-grid-line': colors.gridLine || '#e5e7eb',
    '--day-calendar-grid-line-primary': colors.gridLinePrimary || '#9ca3af',
    '--day-calendar-header-bg': colors.headerBackground || '#ffffff',
    '--day-calendar-header-text': colors.headerText || '#374151',
    '--day-calendar-header-border': colors.headerBorder || '#d1d5db',
    '--day-calendar-current-time-line': colors.currentTimeLine || '#ef4444',
    '--day-calendar-header-font': fonts.header || 'system-ui, sans-serif',
    '--day-calendar-content-font': fonts.content || 'system-ui, sans-serif',
    '--day-calendar-header-height': '40px',
    '--day-calendar-slot-height': `${slotHeight}px`,
  } as CSSProperties;

  const minMechanicsWidth = mechanics.length * minColumnWidth;
  const innerMinWidth = timeColumnWidth + minMechanicsWidth;

  const navButtonStyle: CSSProperties = {
    appearance: 'none',
    border: '1px solid var(--day-calendar-header-border)',
    background: 'var(--day-calendar-header-bg)',
    color: 'var(--day-calendar-header-text)',
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    lineHeight: 1.2,
    ...styles.navigationButton,
  };

  return (
    <div
      className={classNames.root}
      style={{
        width,
        height,
        boxSizing: 'border-box',
        background: 'var(--day-calendar-bg)',
        fontFamily: 'var(--day-calendar-content-font)',
        color: 'var(--day-calendar-header-text)',
        display: 'flex',
        flexDirection: 'column',
        ...cssVars,
        ...styles.root,
      }}
      data-day-calendar
    >
      {showNavigation && (
        <div
          className={classNames.navigation}
          data-day-calendar-navigation
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid var(--day-calendar-header-border)',
            background: 'var(--day-calendar-header-bg)',
            flexShrink: 0,
            fontFamily: 'var(--day-calendar-header-font)',
            ...styles.navigation,
          }}
        >
          <button
            type="button"
            className={classNames.navigationButton}
            onClick={handlePrevDay}
            aria-label="Previous day"
            style={navButtonStyle}
          >
            {navigationLabels?.previous ?? '←'}
          </button>
          <button
            type="button"
            className={classNames.navigationButton}
            onClick={handleToday}
            style={navButtonStyle}
          >
            {navigationLabels?.today ?? 'Today'}
          </button>
          <button
            type="button"
            className={classNames.navigationButton}
            onClick={handleNextDay}
            aria-label="Next day"
            style={navButtonStyle}
          >
            {navigationLabels?.next ?? '→'}
          </button>
          <div
            className={classNames.navigationLabel}
            style={{
              marginLeft: 12,
              fontWeight: 600,
              fontSize: 14,
              ...styles.navigationLabel,
            }}
          >
            {dateLabel}
          </div>
        </div>
      )}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'auto',
        }}
      >
      <div
        style={{
          position: 'relative',
          minWidth: innerMinWidth,
          width: '100%',
        }}
      >
        {/* Header row: corner + mechanic header cells */}
        <div
          className={classNames.header}
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            height: headerHeightPx,
            background: 'var(--day-calendar-header-bg)',
            borderBottom: '1px solid var(--day-calendar-header-border)',
            fontFamily: 'var(--day-calendar-header-font)',
            ...styles.header,
          }}
        >
          <div
            style={{
              position: 'sticky',
              left: 0,
              zIndex: 30,
              width: timeColumnWidth,
              flexShrink: 0,
              background: 'var(--day-calendar-header-bg)',
              borderRight: '1px solid var(--day-calendar-header-border)',
              boxSizing: 'border-box',
            }}
          />
          {mechanics.map(mechanic => (
            <div
              key={mechanic.id}
              className={classNames.headerCell}
              style={{
                flex: '1 1 0',
                minWidth: minColumnWidth,
                borderRight: '1px solid var(--day-calendar-header-border)',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 8px',
                fontWeight: 600,
                color: mechanic.color || 'var(--day-calendar-header-text)',
                ...styles.headerCell,
              }}
            >
              {renderMechanicHeader ? renderMechanicHeader(mechanic) : mechanic.name}
            </div>
          ))}
        </div>

        {/* Body row: time column + mechanic columns */}
        <div style={{ display: 'flex', height: bodyHeight, position: 'relative' }}>
          <div
            className={classNames.timeColumn}
            style={{
              position: 'sticky',
              left: 0,
              zIndex: 10,
              width: timeColumnWidth,
              flexShrink: 0,
              background: 'var(--day-calendar-bg)',
              borderRight: '1px solid var(--day-calendar-header-border)',
              boxSizing: 'border-box',
              ...styles.timeColumn,
            }}
          >
            {slotTimes.map((time, i) => (
              <div
                key={i}
                className={classNames.timeLabel}
                style={{
                  height: slotHeight,
                  borderBottom: '1px solid var(--day-calendar-grid-line)',
                  boxSizing: 'border-box',
                  fontSize: 11,
                  color: 'var(--day-calendar-header-text)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingTop: 2,
                  paddingRight: 6,
                  userSelect: 'none',
                  ...styles.timeLabel,
                }}
              >
                {renderTimeLabel ? renderTimeLabel(time) : formatHHmm(time)}
              </div>
            ))}
          </div>

          {mechanics.map(mechanic => {
            const laidOut = eventsByMechanic.get(mechanic.id) ?? [];
            return (
              <div
                key={mechanic.id}
                ref={el => setColumnRef(mechanic.id, el)}
                data-day-calendar-column={mechanic.id}
                className={classNames.mechanicColumn}
                style={{
                  flex: '1 1 0',
                  minWidth: minColumnWidth,
                  position: 'relative',
                  borderRight: '1px solid var(--day-calendar-header-border)',
                  boxSizing: 'border-box',
                  ...styles.mechanicColumn,
                }}
              >
                {/* Slot grid (clickable) */}
                {slotTimes.map((_, i) => (
                  <div
                    key={i}
                    className={classNames.slot}
                    onClick={onSlotClick ? () => handleSlotClick(mechanic.id, i) : undefined}
                    style={{
                      height: slotHeight,
                      borderBottom: '1px solid var(--day-calendar-grid-line)',
                      boxSizing: 'border-box',
                      cursor: onSlotClick ? 'pointer' : 'default',
                      ...styles.slot,
                    }}
                  />
                ))}

                {/* Events (absolute-positioned on top of slots) */}
                {laidOut.map(({ event, top, height, leftPct, widthPct }) => {
                  const draggable = isEventDraggable(event);
                  const isDragging = dragPreview?.event.id === event.id;
                  const onPointerDown = draggable
                    ? (e: React.PointerEvent) => handleEventPointerDown(event, mechanic.id, e)
                    : undefined;
                  if (renderEvent) {
                    // `display: contents` keeps the consumer's absolutely
                    // positioned element laid out against the column while
                    // still receiving its bubbled pointer events.
                    return (
                      <div
                        key={event.id}
                        style={{ display: 'contents' }}
                        onPointerDown={onPointerDown}
                        data-day-calendar-event={event.id}
                      >
                        {renderEvent({
                          event,
                          top,
                          height,
                          left: leftPct,
                          width: widthPct,
                          draggable,
                          isDragging,
                          isDragPreview: false,
                        })}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={event.id}
                      className={classNames.event}
                      data-day-calendar-event={event.id}
                      onPointerDown={onPointerDown}
                      onClick={onEventClick ? e => handleEventClick(event, e) : undefined}
                      style={{
                        ...defaultEventStyle(event, mechanic),
                        top,
                        height,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        cursor: draggable ? 'grab' : onEventClick ? 'pointer' : 'default',
                        opacity: isDragging ? 0.4 : undefined,
                        ...styles.event,
                      }}
                    >
                      {event.title}
                    </div>
                  );
                })}

                {/* Drag preview at the drop target */}
                {dragPreview && dragPreview.mechanicId === mechanic.id && (() => {
                  const { event, startMs } = dragPreview;
                  const endMs = startMs + Math.max(0, toTimestamp(event.endTime) - toTimestamp(event.startTime));
                  const top = (startMs - visibleStartMs) * pixelsPerMs;
                  const height = Math.max(
                    slotHeight / 4,
                    (Math.min(endMs, visibleEndMs) - startMs) * pixelsPerMs
                  );
                  return (
                    <div
                      className={classNames.dragPreview}
                      data-day-calendar-drag-preview={event.id}
                      style={{ pointerEvents: 'none', ...styles.dragPreview }}
                    >
                      {renderEvent ? (
                        renderEvent({
                          event,
                          top,
                          height,
                          left: 0,
                          width: 100,
                          draggable: true,
                          isDragging: false,
                          isDragPreview: true,
                        })
                      ) : (
                        <div
                          className={classNames.event}
                          style={{
                            ...defaultEventStyle(event, mechanic),
                            top,
                            height,
                            left: 0,
                            width: '100%',
                            zIndex: 4,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            ...styles.event,
                          }}
                        >
                          {event.title}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Current-time line (across all mechanic columns) */}
          {currentTimeOnDay && (
            <div
              className={classNames.currentTimeLine}
              style={{
                position: 'absolute',
                top: currentTimeTop,
                left: timeColumnWidth,
                right: 0,
                height: 0,
                borderTop: '2px solid var(--day-calendar-current-time-line)',
                pointerEvents: 'none',
                zIndex: 5,
                ...styles.currentTimeLine,
              }}
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
