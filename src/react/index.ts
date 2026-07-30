/**
 * React components for timeline calendar
 */

export * from './types';
export * from './headless';
export * from './hooks';

// Export utility functions for zoom configuration
export { timeSpanToZoom } from '../utils/dateUtils';

// Export opening-hours range helper (used by DayCalendar)
export type { OpeningHoursRange } from '../utils/openingHoursRange';
export { openingHoursRangeForDate } from '../utils/openingHoursRange';

// Export closed-hours helpers (used by compressClosedHours)
export type { ClosedRangesOptions } from '../utils/closedRanges';
export { openRangesForDay, closedRangesInWindow, mergeRanges } from '../utils/closedRanges';

// Export aggregation utilities
export type { TimelineItemData as AggregationItemData, AggregatedPeriod as AggregatedPeriodData } from '../utils/aggregationUtils';
export {
  aggregateItemsByPeriod,
  getGranularity,
  shouldUseAggregatedView,
  generatePeriods,
  calculateAvailableTime
} from '../utils/aggregationUtils';

// Export locales and locale types
export type { CalendarLocale } from '../utils/locales';
export {
  enUS,
  deDE,
  frFR,
  esES,
  itIT,
  ptPT,
  nlNL,
  svSE,
  noNO,
  daDK,
  plPL,
  ruRU,
  fiFI,
  defaultLocale
} from '../utils/locales';

// Export themes and theme types
export type { ThemeName } from './themes';
export { lightTheme, darkTheme, compactTheme, compactDarkTheme, themes } from './themes';
