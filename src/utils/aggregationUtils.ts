import type { AvailabilityConfig } from '../react/types';
import { isAvailable } from './availabilityUtils';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, addWeeks, addMonths } from 'date-fns';

/**
 * Granularity for aggregating timeline items
 */
export type AggregationGranularity = 'week' | 'month' | 'dynamic';

/**
 * Single timeline item data for aggregation
 */
export interface TimelineItemData {
  startTime: number;
  endTime: number;
  duration: number;
  type?: string;
}

/**
 * Aggregated data for a time period
 */
export interface AggregatedPeriod {
  /** Period start timestamp */
  start: number;
  /** Period end timestamp */
  end: number;
  /** Total available milliseconds in this period (based on availability config) */
  totalAvailable: number;
  /** Total occupied milliseconds in this period */
  totalOccupied: number;
  /** Occupancy percentage (0-100) */
  occupancyPercent: number;
  /** Breakdown by item type */
  byType: Record<string, {
    /** Total duration in ms for this type */
    duration: number;
    /** Number of items of this type */
    count: number;
    /** Percentage of total occupied time */
    percentage: number;
  }>;
}

/**
 * Determine which granularity to use based on viewport duration
 */
export function getGranularity(
  viewportDurationMs: number,
  granularity: AggregationGranularity
): 'week' | 'month' {
  if (granularity === 'dynamic') {
    // Dynamic: use weeks for 6-12 months, months for > 12 months
    const monthsInMs = 30.44 * 24 * 60 * 60 * 1000; // Average month
    const viewportMonths = viewportDurationMs / monthsInMs;

    return viewportMonths > 12 ? 'month' : 'week';
  }

  return granularity;
}

/**
 * Get period boundaries (start and end) for a given timestamp and granularity
 */
export function getPeriodBoundaries(
  timestamp: number,
  granularity: 'week' | 'month'
): { start: number; end: number } {
  const date = new Date(timestamp);

  if (granularity === 'week') {
    // ISO week: Monday to Sunday
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });

    return {
      start: start.getTime(),
      end: end.getTime()
    };
  } else {
    // Calendar month
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    return {
      start: start.getTime(),
      end: end.getTime()
    };
  }
}

/**
 * Generate all periods within a time range
 */
export function generatePeriods(
  rangeStart: number,
  rangeEnd: number,
  granularity: 'week' | 'month'
): Array<{ start: number; end: number }> {
  const periods: Array<{ start: number; end: number }> = [];

  // Get the first period that contains or starts after rangeStart
  let currentPeriod = getPeriodBoundaries(rangeStart, granularity);

  while (currentPeriod.start < rangeEnd) {
    // Clip period to range boundaries
    const periodStart = Math.max(currentPeriod.start, rangeStart);
    const periodEnd = Math.min(currentPeriod.end, rangeEnd);

    periods.push({
      start: periodStart,
      end: periodEnd
    });

    // Move to next period
    const nextDate = granularity === 'week'
      ? addWeeks(new Date(currentPeriod.start), 1)
      : addMonths(new Date(currentPeriod.start), 1);

    currentPeriod = getPeriodBoundaries(nextDate.getTime(), granularity);
  }

  return periods;
}

/**
 * Calculate total available time in a period based on availability config
 */
export function calculateAvailableTime(
  periodStart: number,
  periodEnd: number,
  availability?: AvailabilityConfig,
  granularity: number = 60 * 60 * 1000 // 1 hour default
): number {
  // If no availability config, assume all time is available
  if (!availability) {
    return periodEnd - periodStart;
  }

  let availableMs = 0;

  // Sample the period at granularity intervals
  for (let timestamp = periodStart; timestamp < periodEnd; timestamp += granularity) {
    if (isAvailable(timestamp, availability)) {
      // Add the granularity duration (or remaining time if less)
      const durationToAdd = Math.min(granularity, periodEnd - timestamp);
      availableMs += durationToAdd;
    }
  }

  return availableMs;
}

/**
 * Calculate how much of an item falls within a period
 */
function getItemDurationInPeriod(
  itemStart: number,
  itemEnd: number,
  periodStart: number,
  periodEnd: number
): number {
  // No overlap
  if (itemEnd <= periodStart || itemStart >= periodEnd) {
    return 0;
  }

  // Calculate overlap
  const overlapStart = Math.max(itemStart, periodStart);
  const overlapEnd = Math.min(itemEnd, periodEnd);

  return overlapEnd - overlapStart;
}

/**
 * Aggregate timeline items into periods
 */
export function aggregateItemsByPeriod(
  items: TimelineItemData[],
  viewportStart: number,
  viewportEnd: number,
  granularity: 'week' | 'month',
  availability?: AvailabilityConfig
): AggregatedPeriod[] {
  // Generate all periods in the viewport
  const periods = generatePeriods(viewportStart, viewportEnd, granularity);

  // Aggregate items into each period
  return periods.map(period => {
    const byType: Record<string, { duration: number; count: number; percentage: number }> = {};
    let totalOccupied = 0;

    // Process each item
    items.forEach(item => {
      const durationInPeriod = getItemDurationInPeriod(
        item.startTime,
        item.endTime,
        period.start,
        period.end
      );

      if (durationInPeriod > 0) {
        const type = item.type || 'default';

        if (!byType[type]) {
          byType[type] = { duration: 0, count: 0, percentage: 0 };
        }

        byType[type].duration += durationInPeriod;
        byType[type].count += 1;
        totalOccupied += durationInPeriod;
      }
    });

    // Calculate total available time in period
    const totalAvailable = calculateAvailableTime(
      period.start,
      period.end,
      availability
    );

    // Calculate occupancy percentage
    const occupancyPercent = totalAvailable > 0
      ? Math.min(100, (totalOccupied / totalAvailable) * 100)
      : 0;

    // Calculate percentage for each type
    Object.keys(byType).forEach(type => {
      byType[type].percentage = totalOccupied > 0
        ? (byType[type].duration / totalOccupied) * 100
        : 0;
    });

    return {
      start: period.start,
      end: period.end,
      totalAvailable,
      totalOccupied,
      occupancyPercent,
      byType
    };
  });
}

/**
 * Determine if aggregated view should be used based on zoom level and item count
 */
export function shouldUseAggregatedView(
  viewportDurationMs: number,
  thresholdDurationMs: number,
  itemCount: number,
  minItemsForAggregation: number
): boolean {
  // Use aggregation if viewport is wider than threshold AND has enough items
  return viewportDurationMs > thresholdDurationMs && itemCount >= minItemsForAggregation;
}
