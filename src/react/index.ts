/**
 * React components for timeline calendar
 */

export * from './types';
export * from './headless';
export * from './hooks';

// Export utility function for zoom configuration
export { timeSpanToZoom } from '../utils/dateUtils';

// Export locales and locale types
export type { CalendarLocale } from '../utils/locales';
export { enUS, fiFI, defaultLocale } from '../utils/locales';
