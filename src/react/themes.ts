import type { TimelineTheme } from './types';

/**
 * Light theme (default)
 */
export const lightTheme: TimelineTheme = {
  colors: {
    background: '#ffffff',
    gridLine: '#e5e7eb',
    gridLinePrimary: '#9ca3af',
    headerBackground: '#ffffff',
    headerText: '#374151',
    headerBorder: '#d1d5db',
    currentTimeLine: '#ef4444',
    timeTypes: {
      century: { text: '#1f2937', line: '#1f2937' },
      decade: { text: '#374151', line: '#374151' },
      year: { text: '#4b5563', line: '#4b5563' },
      month: { text: '#6b7280', line: '#6b7280' },
      week: { text: '#6b7280', line: '#6b7280' },
      day: { text: '#9ca3af', line: '#9ca3af' },
      halfday: { text: '#9ca3af', line: '#9ca3af' },
      quarterday: { text: '#9ca3af', line: '#9ca3af' },
      hour: { text: '#d1d5db', line: '#d1d5db' },
      halfhour: { text: '#d1d5db', line: '#d1d5db' },
      quarterhour: { text: '#d1d5db', line: '#d1d5db' },
      minute: { text: '#e5e7eb', line: '#e5e7eb' },
      halfminute: { text: '#e5e7eb', line: '#e5e7eb' },
      quarterminute: { text: '#e5e7eb', line: '#e5e7eb' },
      second: { text: '#f3f4f6', line: '#f3f4f6' },
      millisecond: { text: '#f9fafb', line: '#f9fafb' },
    }
  },
  fonts: {
    header: 'system-ui, -apple-system, sans-serif',
    content: 'system-ui, -apple-system, sans-serif',
  },
  spacing: {
    headerHeight: 80,
    headerRowHeight: 40,
    rowHeight: 60,
  }
};

/**
 * Dark theme
 */
export const darkTheme: TimelineTheme = {
  colors: {
    background: '#1f2937',
    gridLine: '#374151',
    gridLinePrimary: '#6b7280',
    headerBackground: '#111827',
    headerText: '#f9fafb',
    headerBorder: '#374151',
    currentTimeLine: '#ef4444',
    timeTypes: {
      century: { text: '#f9fafb', line: '#f9fafb' },
      decade: { text: '#e5e7eb', line: '#e5e7eb' },
      year: { text: '#d1d5db', line: '#d1d5db' },
      month: { text: '#9ca3af', line: '#9ca3af' },
      week: { text: '#9ca3af', line: '#9ca3af' },
      day: { text: '#6b7280', line: '#6b7280' },
      halfday: { text: '#6b7280', line: '#6b7280' },
      quarterday: { text: '#6b7280', line: '#6b7280' },
      hour: { text: '#4b5563', line: '#4b5563' },
      halfhour: { text: '#4b5563', line: '#4b5563' },
      quarterhour: { text: '#4b5563', line: '#4b5563' },
      minute: { text: '#374151', line: '#374151' },
      halfminute: { text: '#374151', line: '#374151' },
      quarterminute: { text: '#374151', line: '#374151' },
      second: { text: '#1f2937', line: '#1f2937' },
      millisecond: { text: '#111827', line: '#111827' },
    }
  },
  fonts: {
    header: 'system-ui, -apple-system, sans-serif',
    content: 'system-ui, -apple-system, sans-serif',
  },
  spacing: {
    headerHeight: 80,
    headerRowHeight: 40,
    rowHeight: 60,
  }
};

/**
 * Available theme presets
 */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export type ThemeName = keyof typeof themes;
