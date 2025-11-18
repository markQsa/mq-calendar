import type { ReactNode, CSSProperties } from 'react';
import type { TimeUnit } from '../core/types';
import type { TimeValue, DurationValue, TimeConverter } from '../utils/timeTypes';
import type { CalendarLocale } from '../utils/locales';

/**
 * Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Time of day in HH:MM format (e.g., "08:00", "17:30")
 */
export type TimeOfDay = string;

/**
 * Specific time range with exact start and end dates
 */
export interface SpecificTimeRange {
  start: TimeValue;
  end: TimeValue;
}

/**
 * Daily time range (e.g., "08:00" to "17:30")
 */
export interface DailyTimeRange {
  start: TimeOfDay;
  end: TimeOfDay;
}

/**
 * Weekly availability pattern - define hours for each day of week
 */
export interface WeeklyPattern {
  [day: number]: DailyTimeRange[];
}

/**
 * Simple pattern for weekdays and weekends
 */
export interface SimplePattern {
  weekdays?: DailyTimeRange[];
  weekends?: DailyTimeRange[];
}

/**
 * Availability configuration
 */
export interface AvailabilityConfig {
  /** Specific time ranges (exact dates) */
  specific?: SpecificTimeRange[];
  /** Weekly recurring pattern */
  weekly?: WeeklyPattern;
  /** Simple weekday/weekend pattern */
  simple?: SimplePattern;
  /** Style for available periods */
  availableStyle?: CSSProperties;
  /** Style for unavailable periods */
  unavailableStyle?: CSSProperties;
  /** Whether to show availability overlay (default: true) */
  showOverlay?: boolean;
}

/**
 * Theme configuration for timeline styling
 */
export interface TimelineTheme {
  colors?: {
    background?: string;
    gridLine?: string;
    gridLinePrimary?: string;
    headerBackground?: string;
    headerText?: string;
    headerBorder?: string;
    currentTimeLine?: string;
    // Time type specific colors
    timeTypes?: {
      century?: { text?: string; line?: string };
      decade?: { text?: string; line?: string };
      year?: { text?: string; line?: string };
      month?: { text?: string; line?: string };
      week?: { text?: string; line?: string };
      day?: { text?: string; line?: string };
      halfday?: { text?: string; line?: string };
      quarterday?: { text?: string; line?: string };
      hour?: { text?: string; line?: string };
      halfhour?: { text?: string; line?: string };
      quarterhour?: { text?: string; line?: string };
      minute?: { text?: string; line?: string };
      halfminute?: { text?: string; line?: string };
      quarterminute?: { text?: string; line?: string };
      second?: { text?: string; line?: string };
      millisecond?: { text?: string; line?: string };
    };
  };
  fonts?: {
    header?: string;
    content?: string;
  };
  spacing?: {
    headerHeight?: number;
    headerRowHeight?: number;
    rowHeight?: number;
  };
}

/**
 * Class names for timeline components
 */
export interface TimelineClassNames {
  root?: string;
  header?: string;
  headerRow?: string;
  headerCell?: string;
  content?: string;
  contentInner?: string;
  gridLine?: string;
  gridLabel?: string;
}

/**
 * Inline styles for timeline components
 */
export interface TimelineStyles {
  root?: CSSProperties;
  header?: CSSProperties;
  headerRow?: CSSProperties;
  headerCell?: CSSProperties;
  content?: CSSProperties;
  contentInner?: CSSProperties;
  gridLine?: CSSProperties;
}

/**
 * Parameters for custom header cell renderer
 */
export interface HeaderCellRenderParams {
  timestamp: number;
  label: string;
  type: TimeUnit;
  isPrimary: boolean;
  level: number;
  width: number;
  position: number;
}

/**
 * Parameters for custom grid line renderer
 */
export interface GridLineRenderParams {
  timestamp: number;
  type: TimeUnit;
  isPrimary: boolean;
  level: number;
  position: number;
  label: string;
}

/**
 * Props for TimelineCalendar component
 */
export interface TimelineCalendarProps {
  /** Start date of the timeline - accepts Date, timestamp, or ISO string */
  startDate: TimeValue;
  /** End date of the timeline - accepts Date, timestamp, or ISO string */
  endDate: TimeValue;
  /** Width of the container (defaults to 100%) */
  width?: number | string;
  /** Height of the container */
  height?: number | string;
  /** Minimum zoom level - either pixels per millisecond (number) or human-readable time span (string like "5 years") */
  minZoom?: number | string;
  /** Maximum zoom level - either pixels per millisecond (number) or human-readable time span (string like "1 hour") */
  maxZoom?: number | string;
  /** Show navigation buttons in header (default: false) */
  showNavigation?: boolean;
  /** Show current time line (default: false) */
  showCurrentTime?: boolean;
  /** Current time line width in pixels (default: 2) */
  currentTimeLineWidth?: number;
  /** Custom time converter (for Day.js, Luxon, etc.) */
  timeConverter?: TimeConverter;
  /** Locale for date/time formatting */
  locale?: CalendarLocale;
  /** Theme - either a preset name ('light' | 'dark') or a custom theme object */
  theme?: 'light' | 'dark' | TimelineTheme;
  /** Custom class names */
  classNames?: TimelineClassNames;
  /** Custom inline styles */
  styles?: TimelineStyles;
  /** Custom header cell renderer */
  renderHeaderCell?: (params: HeaderCellRenderParams) => ReactNode;
  /** Custom grid line renderer */
  renderGridLine?: (params: GridLineRenderParams) => ReactNode;
  /** Availability configuration for showing available/unavailable time periods */
  availability?: AvailabilityConfig;
  /** Children (TimelineItem components) */
  children?: ReactNode;
  /** Callback when viewport changes */
  onViewportChange?: (start: Date, end: Date) => void;
  /** Callback when zoom changes */
  onZoomChange?: (pixelsPerMs: number) => void;
}

/**
 * Props for TimelineItem component
 */
export interface TimelineItemProps {
  /** Start time of the item - accepts Date, timestamp, or ISO string */
  startTime: TimeValue;
  /** Duration - can be milliseconds or human-readable (e.g., "1 day", "2 hours") */
  duration: DurationValue;
  /** Alternative to duration: specify end time directly */
  endTime?: TimeValue;
  /** Row/lane for vertical positioning */
  row?: number;
  /** Enable drag and drop (default: false) */
  draggable?: boolean;
  /** Allow dragging between rows (default: false) */
  allowRowChange?: boolean;
  /** Called when drag starts */
  onDragStart?: (timestamp: number, row: number, rowGroupId?: string) => void;
  /** Called during drag with current timestamp */
  onDrag?: (currentTimestamp: number, currentRow: number, currentRowGroupId?: string) => void;
  /** Called when row changes during drag */
  onRowChange?: (newRow: number, oldRow: number, newRowGroupId?: string, oldRowGroupId?: string) => void;
  /** Called when drag ends with the new timestamp and row */
  onDragEnd?: (newTimestamp: number, originalTimestamp: number, newRow: number, originalRow: number, newRowGroupId?: string, originalRowGroupId?: string) => void;
  /** Custom class name */
  className?: string;
  /** Custom inline style */
  style?: CSSProperties;
  /** Children to render */
  children?: ReactNode;
}

/**
 * Props for Row component
 */
export interface RowProps {
  /** Starting row index (default: 0) */
  startRow?: number;
  /** Number of rows this component occupies (default: 1) */
  rowCount?: number;
  /** Custom class name */
  className?: string;
  /** Custom inline style */
  style?: CSSProperties;
  /** Children (typically TimelineItem components) */
  children?: ReactNode;
}

/**
 * Parameters for custom header renderer in CollapsibleRow
 */
export interface CollapsibleRowHeaderRenderParams {
  isExpanded: boolean;
  label: string;
  toggle: () => void;
}

/**
 * Props for CollapsibleRow component
 */
export interface CollapsibleRowProps {
  /** Unique identifier for this row */
  id: string;
  /** Label text for the header */
  label: string;
  /** Number of rows this component occupies when expanded (default: 1) */
  rowCount?: number;
  /** Whether row is expanded by default (default: true) */
  defaultExpanded?: boolean;
  /** Custom class name for content area */
  className?: string;
  /** Custom inline style for content area */
  style?: CSSProperties;
  /** Custom class name for header */
  headerClassName?: string;
  /** Custom inline style for header */
  headerStyle?: CSSProperties;
  /** Custom header renderer */
  renderHeader?: (params: CollapsibleRowHeaderRenderParams) => ReactNode;
  /** Children (typically TimelineItem components) */
  children?: ReactNode;
}

/**
 * Props for TimelineRow component (unified Row and CollapsibleRow)
 */
export interface TimelineRowProps {
  /** Unique identifier for this row (auto-generated if not provided) */
  id?: string;
  /** Label text for the header (required if collapsible=true and showHeader=true) */
  label?: string;
  /** Number of rows this component occupies when expanded (default: 1) */
  rowCount?: number;
  /** Starting row index - only used if not within TimelineRowGroup (default: 0) */
  startRow?: number;
  /** Whether this row can be collapsed (default: false) */
  collapsible?: boolean;
  /** Whether to show the header (default: true, only applies if collapsible=true) */
  showHeader?: boolean;
  /** Whether row is expanded by default (default: true) */
  defaultExpanded?: boolean;
  /** Custom class name for content area */
  className?: string;
  /** Custom inline style for content area */
  style?: CSSProperties;
  /** Custom class name for header */
  headerClassName?: string;
  /** Custom inline style for header */
  headerStyle?: CSSProperties;
  /** Custom header renderer */
  renderHeader?: (params: CollapsibleRowHeaderRenderParams) => ReactNode;
  /** Children (typically TimelineItem components) */
  children?: ReactNode;
}
