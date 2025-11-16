/**
 * Time unit types for grid display
 */
export type TimeUnit = 'century' | 'decade' | 'year' | 'month' | 'week' | 'day' | 'halfday' | 'quarterday' | 'hour' | 'halfhour' | 'quarterhour' | 'minute' | 'halfminute' | 'quarterminute' | 'second' | 'millisecond';

/**
 * Configuration for the timeline
 */
export interface TimelineConfig {
  /** Start of visible viewport */
  viewportStart: Date;
  /** End of visible viewport */
  viewportEnd: Date;
  /** Container width in pixels */
  containerWidth: number;
  /** Minimum zoom level (pixels per millisecond) */
  minZoom?: number;
  /** Maximum zoom level (pixels per millisecond) */
  maxZoom?: number;
}

/**
 * Current zoom state
 */
export interface ZoomState {
  /** Current zoom level (pixels per millisecond) - continuous value */
  pixelsPerMs: number;
  /** Center point for zoom operations (timestamp) */
  centerTimestamp: number;
}

/**
 * Represents a vertical grid line with label
 */
export interface GridLine {
  /** Timestamp for this grid line */
  timestamp: number;
  /** X position in pixels relative to viewport start */
  position: number;
  /** Type of time unit this line represents */
  type: TimeUnit;
  /** Display label for this grid line */
  label: string;
  /** Whether this is a primary grid line (e.g., year vs month) */
  isPrimary: boolean;
  /** Level/tier of this grid line (0 = most important, higher = less important) */
  level: number;
}

/**
 * Represents a part of a split header cell (for combined captions like "Jan 2025")
 */
export interface HeaderCellPart {
  /** Label text for this part */
  label: string;
  /** Type of time unit this part represents */
  type: TimeUnit;
  /** Timestamp for this part */
  timestamp: number;
  /** Relative width as a fraction (0-1) */
  widthFraction: number;
}

/**
 * Represents a header cell in the timeline header
 */
export interface HeaderCell {
  /** Timestamp for the start of this period */
  timestamp: number;
  /** X position in pixels */
  position: number;
  /** Width in pixels */
  width: number;
  /** Type of time unit */
  type: TimeUnit;
  /** Display label */
  label: string;
  /** Whether this is a primary cell */
  isPrimary: boolean;
  /** Level/tier (0 = top row, higher = lower rows) */
  level: number;
  /** Optional parts for split captions (e.g., month + year) */
  parts?: HeaderCellPart[];
  /** Whether this cell is partially visible at viewport edges */
  isPartiallyVisible?: boolean;
}

/**
 * Item to be displayed on the timeline
 */
export interface TimelineItemData {
  /** Unique identifier */
  id: string;
  /** Start timestamp */
  startTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Row/lane for vertical positioning */
  row?: number;
  /** Custom data payload */
  data?: unknown;
}

/**
 * Viewport state
 */
export interface ViewportState {
  /** Start timestamp of visible area */
  start: number;
  /** End timestamp of visible area */
  end: number;
  /** Scroll offset in pixels */
  scrollOffset: number;
}

/**
 * Result of a zoom operation
 */
export interface ZoomResult {
  /** New zoom state */
  zoomState: ZoomState;
  /** New viewport state */
  viewport: ViewportState;
}

/**
 * Result of a scroll operation
 */
export interface ScrollResult {
  /** New viewport state */
  viewport: ViewportState;
}

/**
 * Grid configuration for determining which time units to display
 */
export interface GridConfig {
  /** Time units to display, in order of importance */
  units: Array<{
    type: TimeUnit;
    level: number;
    isPrimary: boolean;
  }>;
  /** Minimum pixel width between grid lines */
  minSpacing: number;
}
