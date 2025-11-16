import type { ReactNode, CSSProperties } from 'react';
import type { TimeUnit } from '../core/types';
import type { TimeValue, DurationValue, TimeConverter } from '../utils/timeTypes';

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
  /** Custom time converter (for Day.js, Luxon, etc.) */
  timeConverter?: TimeConverter;
  /** Theme configuration */
  theme?: TimelineTheme;
  /** Custom class names */
  classNames?: TimelineClassNames;
  /** Custom inline styles */
  styles?: TimelineStyles;
  /** Custom header cell renderer */
  renderHeaderCell?: (params: HeaderCellRenderParams) => ReactNode;
  /** Custom grid line renderer */
  renderGridLine?: (params: GridLineRenderParams) => ReactNode;
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
  /** Custom class name */
  className?: string;
  /** Custom inline style */
  style?: CSSProperties;
  /** Children to render */
  children?: ReactNode;
}
