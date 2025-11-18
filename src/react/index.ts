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
export { lightTheme, darkTheme, themes } from './themes';
