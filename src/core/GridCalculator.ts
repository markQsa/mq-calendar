import type { GridLine, HeaderCell, TimeUnit, ViewportState, ZoomState } from './types';
import { getStartOf, addTime, formatTimeUnit, TIME_UNIT_MS } from '../utils/dateUtils';

export interface GridCalculatorConfig {
  /** Minimum spacing between grid lines in pixels */
  minSpacing: number;
  /** Maximum spacing before adding more detailed grid lines */
  maxSpacing: number;
  /** Locale for formatting dates */
  locale?: import('../utils/locales').CalendarLocale;
}

/**
 * Calculates which grid lines and header cells to display based on zoom level
 */
export class GridCalculator {
  private config: GridCalculatorConfig;

  constructor(config?: GridCalculatorConfig) {
    this.config = {
      minSpacing: config?.minSpacing ?? 60,
      maxSpacing: config?.maxSpacing ?? 200,
      locale: config?.locale
    };
  }

  /**
   * Determine appropriate time units to display based on zoom level
   */
  private determineTimeUnits(pixelsPerMs: number): Array<{ unit: TimeUnit; level: number; isPrimary: boolean }> {
    const units: Array<{ unit: TimeUnit; level: number; isPrimary: boolean }> = [];

    // Calculate pixel width for each time unit
    const pixelWidths = {
      century: TIME_UNIT_MS.century * pixelsPerMs,
      decade: TIME_UNIT_MS.decade * pixelsPerMs,
      year: TIME_UNIT_MS.year * pixelsPerMs,
      month: TIME_UNIT_MS.month * pixelsPerMs,
      week: TIME_UNIT_MS.week * pixelsPerMs,
      day: TIME_UNIT_MS.day * pixelsPerMs,
      halfday: TIME_UNIT_MS.halfday * pixelsPerMs,
      quarterday: TIME_UNIT_MS.quarterday * pixelsPerMs,
      hour: TIME_UNIT_MS.hour * pixelsPerMs,
      halfhour: TIME_UNIT_MS.halfhour * pixelsPerMs,
      quarterhour: TIME_UNIT_MS.quarterhour * pixelsPerMs,
      minute: TIME_UNIT_MS.minute * pixelsPerMs,
      halfminute: TIME_UNIT_MS.halfminute * pixelsPerMs,
      quarterminute: TIME_UNIT_MS.quarterminute * pixelsPerMs,
      second: TIME_UNIT_MS.second * pixelsPerMs,
      millisecond: TIME_UNIT_MS.millisecond * pixelsPerMs,
    };

    let level = 0;

    // Check if year captions can fit
    const yearLabel = "2025"; // 4 digits
    const yearTextWidth = this.estimateTextWidth(yearLabel, false);
    const yearCaptionFits = yearTextWidth <= pixelWidths.year;

    // Check if decade captions can fit
    const decadeLabel = "2020s"; // Worst case
    const decadeTextWidth = this.estimateTextWidth(decadeLabel, false);
    const decadeCaptionFits = decadeTextWidth <= pixelWidths.decade;

    // Add all units that meet minimum spacing - this prevents infinite loops
    // Century is only shown if decade captions can't fit
    if (pixelWidths.century >= this.config.minSpacing && !decadeCaptionFits) {
      units.push({ unit: 'century', level: level++, isPrimary: level === 1 });
    }
    // Decade is only shown if year captions can't fit
    if (pixelWidths.decade >= this.config.minSpacing && !yearCaptionFits) {
      units.push({ unit: 'decade', level: level++, isPrimary: level === 1 });
    }
    // Year is always shown if it meets minimum spacing
    if (pixelWidths.year >= this.config.minSpacing) {
      units.push({ unit: 'year', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.month >= this.config.minSpacing) {
      units.push({ unit: 'month', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.week >= this.config.minSpacing) {
      units.push({ unit: 'week', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.day >= this.config.minSpacing) {
      units.push({ unit: 'day', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.halfday >= this.config.minSpacing) {
      units.push({ unit: 'halfday', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.quarterday >= this.config.minSpacing) {
      units.push({ unit: 'quarterday', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.hour >= this.config.minSpacing) {
      units.push({ unit: 'hour', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.halfhour >= this.config.minSpacing) {
      units.push({ unit: 'halfhour', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.quarterhour >= this.config.minSpacing) {
      units.push({ unit: 'quarterhour', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.minute >= this.config.minSpacing) {
      units.push({ unit: 'minute', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.halfminute >= this.config.minSpacing) {
      units.push({ unit: 'halfminute', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.quarterminute >= this.config.minSpacing) {
      units.push({ unit: 'quarterminute', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.second >= this.config.minSpacing) {
      units.push({ unit: 'second', level: level++, isPrimary: level === 1 });
    }
    if (pixelWidths.millisecond >= this.config.minSpacing) {
      units.push({ unit: 'millisecond', level: level++, isPrimary: level === 1 });
    }

    // If nothing meets spacing, just show year
    if (units.length === 0) {
      units.push({ unit: 'year', level: 0, isPrimary: true });
    }

    return units;
  }

  /**
   * Calculate grid lines for the visible viewport
   */
  calculateGridLines(viewport: ViewportState, zoom: ZoomState): GridLine[] {
    const lines: GridLine[] = [];
    const units = this.determineTimeUnits(zoom.pixelsPerMs);

    for (const { unit, level, isPrimary } of units) {
      const unitLines = this.generateGridLinesForUnit(
        viewport.start,
        viewport.end,
        unit,
        level,
        isPrimary,
        zoom.pixelsPerMs
      );
      lines.push(...unitLines);
    }

    return lines.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Generate grid lines for a specific time unit
   */
  private generateGridLinesForUnit(
    startTime: number,
    endTime: number,
    unit: TimeUnit,
    level: number,
    isPrimary: boolean,
    pixelsPerMs: number
  ): GridLine[] {
    const lines: GridLine[] = [];
    const startDate = new Date(startTime);

    // Get the first boundary of this unit
    let current = getStartOf(startDate, unit);

    // If we're before the start, move to the next unit boundary
    if (current.getTime() < startTime) {
      current = addTime(current, 1, unit);
    }

    // Generate lines until we pass the end time
    while (current.getTime() <= endTime) {
      const timestamp = current.getTime();
      const position = (timestamp - startTime) * pixelsPerMs;

      lines.push({
        timestamp,
        position,
        type: unit,
        label: formatTimeUnit(current, unit, this.config.locale),
        isPrimary,
        level
      });

      current = addTime(current, 1, unit);
    }

    return lines;
  }

  /**
   * Estimate text width in pixels
   */
  private estimateTextWidth(text: string, isPrimary: boolean): number {
    // Approximate character widths for system-ui font
    // Primary text uses larger font size (14px, weight 600)
    // Non-primary text uses smaller font size (12px, weight 400)
    const avgCharWidth = isPrimary ? 8 : 7;
    return text.length * avgCharWidth + 16; // Add padding (8px on each side)
  }


  /**
   * Check if year can fit in month cells for combining
   * We check based on the pixel width of one month at this zoom level
   */
  private canCombineYearWithMonth(pixelsPerMs: number): boolean {
    // Calculate the pixel width of one month at this zoom level
    const monthWidth = TIME_UNIT_MS.month * pixelsPerMs;

    // Find the longest month name in current locale
    const monthNames = this.config.locale?.monthsShort || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const longestMonthLabel = monthNames.reduce((a, b) => a.length > b.length ? a : b);
    const yearLabel = "2025"; // 4 digits
    const combinedLabel = `${longestMonthLabel} ${yearLabel}`;

    // Assuming non-primary (isPrimary = false) as months are typically not primary
    const combinedWidth = this.estimateTextWidth(combinedLabel, false);

    // If the worst case fits, then all months will fit
    return combinedWidth <= monthWidth;
  }

  /**
   * Combine year label with month cells
   */
  private combineYearWithMonth(monthCells: HeaderCell[]): HeaderCell[] {
    return monthCells.map(cell => {
      const monthDate = new Date(cell.timestamp);
      const yearLabel = monthDate.getFullYear().toString();
      const yearTimestamp = new Date(monthDate.getFullYear(), 0, 1).getTime(); // Jan 1 of that year

      // If partially visible, only show the month part (actual time type)
      if (cell.isPartiallyVisible) {
        return {
          ...cell,
          label: cell.label,
          parts: undefined // No combined parts for partial cells
        };
      }

      return {
        ...cell,
        label: `${cell.label} ${yearLabel}`,
        parts: [
          {
            label: cell.label, // Month label (e.g., "Jan")
            type: 'month' as TimeUnit,
            timestamp: cell.timestamp,
            widthFraction: 0.5 // 50% for month
          },
          {
            label: yearLabel, // Year label (e.g., "2025")
            type: 'year' as TimeUnit,
            timestamp: yearTimestamp,
            widthFraction: 0.5 // 50% for year
          }
        ]
      };
    });
  }

  /**
   * Check if month can fit in week cells for combining
   */
  private canCombineMonthWithWeek(pixelsPerMs: number): boolean {
    const weekWidth = TIME_UNIT_MS.week * pixelsPerMs;
    // Find the longest month name in current locale
    const monthNames = this.config.locale?.monthsShort || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const longestMonthLabel = monthNames.reduce((a, b) => a.length > b.length ? a : b);
    const weekAbbr = this.config.locale?.weekAbbr || 'W';
    // Longest case: e.g., "Vko52 Maalis" for Finnish
    const combinedLabel = `${weekAbbr}52 ${longestMonthLabel}`;
    const combinedWidth = this.estimateTextWidth(combinedLabel, false);
    return combinedWidth <= weekWidth;
  }

  /**
   * Check if month + year can fit in week cells for combining
   */
  private canCombineYearMonthWithWeek(pixelsPerMs: number): boolean {
    const weekWidth = TIME_UNIT_MS.week * pixelsPerMs;
    // Find the longest month name in current locale
    const monthNames = this.config.locale?.monthsShort || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const longestMonthLabel = monthNames.reduce((a, b) => a.length > b.length ? a : b);
    const weekAbbr = this.config.locale?.weekAbbr || 'W';
    // Longest case: e.g., "Vko52 Maalis 2025" for Finnish
    const combinedLabel = `${weekAbbr}52 ${longestMonthLabel} 2025`;
    const combinedWidth = this.estimateTextWidth(combinedLabel, false);
    // Allow 80% threshold - combined captions use distributed layout
    return combinedWidth <= weekWidth * 1.25;
  }

  /**
   * Combine month label with week cells
   */
  private combineMonthWithWeek(weekCells: HeaderCell[]): HeaderCell[] {
    return weekCells.map(cell => {
      const weekDate = new Date(cell.timestamp);
      const monthLabel = formatTimeUnit(weekDate, 'month', this.config.locale);
      const monthStart = getStartOf(weekDate, 'month');

      // If partially visible, only show the week part (actual time type)
      if (cell.isPartiallyVisible) {
        return {
          ...cell,
          label: cell.label,
          parts: undefined
        };
      }

      return {
        ...cell,
        label: `${cell.label} ${monthLabel}`,
        parts: [
          {
            label: cell.label, // Week label (e.g., "W1")
            type: 'week' as TimeUnit,
            timestamp: cell.timestamp,
            widthFraction: 0.5 // 50% for week
          },
          {
            label: monthLabel, // Month label (e.g., "Jan")
            type: 'month' as TimeUnit,
            timestamp: monthStart.getTime(),
            widthFraction: 0.5 // 50% for month
          }
        ]
      };
    });
  }

  /**
   * Combine year + month labels with week cells
   */
  private combineYearMonthWithWeek(weekCells: HeaderCell[]): HeaderCell[] {
    return weekCells.map(cell => {
      const weekDate = new Date(cell.timestamp);
      const monthLabel = formatTimeUnit(weekDate, 'month', this.config.locale);
      const yearLabel = weekDate.getFullYear().toString();
      const monthStart = getStartOf(weekDate, 'month');
      const yearStart = new Date(weekDate.getFullYear(), 0, 1);

      // If partially visible, only show the week part (actual time type)
      if (cell.isPartiallyVisible) {
        return {
          ...cell,
          label: cell.label,
          parts: undefined
        };
      }

      return {
        ...cell,
        label: `${cell.label} ${monthLabel} ${yearLabel}`,
        parts: [
          {
            label: cell.label, // Week label (e.g., "W1")
            type: 'week' as TimeUnit,
            timestamp: cell.timestamp,
            widthFraction: 1/3 // 33% for week
          },
          {
            label: monthLabel, // Month label (e.g., "Jan")
            type: 'month' as TimeUnit,
            timestamp: monthStart.getTime(),
            widthFraction: 1/3 // 33% for month
          },
          {
            label: yearLabel, // Year label (e.g., "2025")
            type: 'year' as TimeUnit,
            timestamp: yearStart.getTime(),
            widthFraction: 1/3 // 33% for year
          }
        ]
      };
    });
  }

  /**
   * Determine if a time unit is redundant when another unit is present
   */
  private isRedundant(unit: TimeUnit, visibleUnits: Set<TimeUnit>): boolean {
    // If century is visible, hide decade and year
    if (visibleUnits.has('century')) {
      if (unit === 'decade' || unit === 'year') {
        return true;
      }
    }

    // If decade is visible, hide year
    if (visibleUnits.has('decade')) {
      if (unit === 'year') {
        return true;
      }
    }

    // If minutes are visible, hide quarterhour, halfhour, and hour (minute shows "06:19" which includes hour)
    if (visibleUnits.has('minute')) {
      if (unit === 'quarterhour' || unit === 'halfhour' || unit === 'hour') {
        return true;
      }
    }

    // If seconds are visible, hide quarterminute and halfminute (second shows "06:19:45" which includes minute)
    if (visibleUnits.has('second')) {
      if (unit === 'quarterminute' || unit === 'halfminute') {
        return true;
      }
    }

    // If halfhour is visible, hide hour (halfhour already shows the time)
    if (visibleUnits.has('halfhour')) {
      if (unit === 'hour') {
        return true;
      }
    }

    // If quarterhour is visible, hide halfhour and hour (quarterhour is more detailed)
    if (visibleUnits.has('quarterhour')) {
      if (unit === 'halfhour' || unit === 'hour') {
        return true;
      }
    }

    // If halfminute is visible, hide minute (halfminute already shows the time)
    if (visibleUnits.has('halfminute')) {
      if (unit === 'minute') {
        return true;
      }
    }

    // If quarterminute is visible, hide halfminute and minute (quarterminute is more detailed)
    if (visibleUnits.has('quarterminute')) {
      if (unit === 'halfminute' || unit === 'minute') {
        return true;
      }
    }

    // If quarterday is visible, hide halfday (quarterday is more detailed)
    if (visibleUnits.has('quarterday')) {
      if (unit === 'halfday') {
        return true;
      }
    }

    // If hour is visible, hide quarterday and halfday (hour is more detailed)
    if (visibleUnits.has('hour')) {
      if (unit === 'quarterday' || unit === 'halfday') {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate header cells for the visible viewport
   */
  calculateHeaderCells(viewport: ViewportState, zoom: ZoomState): HeaderCell[][] {
    const units = this.determineTimeUnits(zoom.pixelsPerMs);
    const rows: HeaderCell[][] = [];

    // Create a set of visible units for quick lookup
    const visibleUnits = new Set(units.map(u => u.unit));

    // Track what to hide and what to combine
    let shouldHideYear = false;
    let shouldHideMonth = false;
    let monthCells: HeaderCell[] | null = null;
    let weekCells: HeaderCell[] | null = null;

    // Check week combining first (higher priority)
    if (visibleUnits.has('week')) {
      // Check if we can combine year + month + week
      if (visibleUnits.has('year') && visibleUnits.has('month') &&
          this.canCombineYearMonthWithWeek(zoom.pixelsPerMs)) {
        // All three fit in week cells
        shouldHideYear = true;
        shouldHideMonth = true;

        const weekUnit = units.find(u => u.unit === 'week');
        if (weekUnit) {
          const tempWeekCells = this.generateHeaderCellsForUnit(
            viewport.start,
            viewport.end,
            weekUnit.unit,
            weekUnit.level,
            weekUnit.isPrimary,
            zoom.pixelsPerMs
          );
          weekCells = this.combineYearMonthWithWeek(tempWeekCells);
        }
      }
      // Check if we can combine month + week
      else if (visibleUnits.has('month') && this.canCombineMonthWithWeek(zoom.pixelsPerMs)) {
        shouldHideMonth = true;

        const weekUnit = units.find(u => u.unit === 'week');
        if (weekUnit) {
          const tempWeekCells = this.generateHeaderCellsForUnit(
            viewport.start,
            viewport.end,
            weekUnit.unit,
            weekUnit.level,
            weekUnit.isPrimary,
            zoom.pixelsPerMs
          );
          weekCells = this.combineMonthWithWeek(tempWeekCells);
        }
      }
    }

    // Check if we can combine year with month (only if not already combined with week)
    if (!shouldHideYear && !shouldHideMonth && visibleUnits.has('year') && visibleUnits.has('month')) {
      // Check based on zoom level if year fits in months
      if (this.canCombineYearWithMonth(zoom.pixelsPerMs)) {
        // Year fits in month cells - we'll combine them
        shouldHideYear = true;

        // Generate month cells with year combined
        const monthUnit = units.find(u => u.unit === 'month');
        if (monthUnit) {
          const tempMonthCells = this.generateHeaderCellsForUnit(
            viewport.start,
            viewport.end,
            monthUnit.unit,
            monthUnit.level,
            monthUnit.isPrimary,
            zoom.pixelsPerMs
          );
          monthCells = this.combineYearWithMonth(tempMonthCells);
        }
      }
    }

    // Generate cells for each unit, skipping redundant ones
    for (const { unit, level, isPrimary } of units) {
      // Skip year if we're combining it
      if (unit === 'year' && shouldHideYear) {
        continue;
      }

      // Skip month if we're combining it with week
      if (unit === 'month' && shouldHideMonth) {
        continue;
      }

      // Skip redundant units
      if (this.isRedundant(unit, visibleUnits)) {
        continue;
      }

      // Use combined cells if we have them
      if (unit === 'week' && weekCells) {
        rows.push(weekCells);
      } else if (unit === 'month' && monthCells) {
        rows.push(monthCells);
      } else {
        const cells = this.generateHeaderCellsForUnit(
          viewport.start,
          viewport.end,
          unit,
          level,
          isPrimary,
          zoom.pixelsPerMs
        );
        rows.push(cells);
      }
    }

    return rows;
  }

  /**
   * Generate header cells for a specific time unit
   */
  private generateHeaderCellsForUnit(
    startTime: number,
    endTime: number,
    unit: TimeUnit,
    level: number,
    isPrimary: boolean,
    pixelsPerMs: number
  ): HeaderCell[] {
    const cells: HeaderCell[] = [];
    const startDate = new Date(startTime);
    let current = getStartOf(startDate, unit);

    while (current.getTime() <= endTime) {
      const timestamp = current.getTime();
      const nextTimestamp = addTime(current, 1, unit).getTime();

      const cellStart = Math.max(timestamp, startTime);
      const cellEnd = Math.min(nextTimestamp, endTime);
      const position = (cellStart - startTime) * pixelsPerMs;
      const width = (cellEnd - cellStart) * pixelsPerMs;

      if (width > 0) {
        const label = formatTimeUnit(current, unit, this.config.locale);

        // Check if cell is partially visible at viewport edges
        const isPartiallyVisible = timestamp < startTime || nextTimestamp > endTime;

        cells.push({
          timestamp,
          position,
          width,
          type: unit,
          label,
          isPrimary,
          level,
          isPartiallyVisible
        });
      }

      current = addTime(current, 1, unit);
    }

    return cells;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GridCalculatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): GridCalculatorConfig {
    return { ...this.config };
  }
}
