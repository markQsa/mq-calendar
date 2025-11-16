/**
 * Localization configuration for timeline calendar
 */

export interface CalendarLocale {
  // Month names (short form)
  monthsShort: string[];
  // Month names (full form)
  monthsFull: string[];
  // Weekday names (short form)
  weekdaysShort: string[];
  // Weekday names (full form)
  weekdaysFull: string[];
  // Week abbreviation (e.g., "W" for "Week")
  weekAbbr: string;
  // AM/PM labels
  am: string;
  pm: string;
  // Time format helpers
  formatters?: {
    // Format for century (e.g., "1900-1999")
    century?: (start: number, end: number) => string;
    // Format for decade (e.g., "1990s")
    decade?: (start: number) => string;
    // Format for year (e.g., "2025")
    year?: (year: number) => string;
    // Format for month (e.g., "Jan")
    month?: (monthIndex: number) => string;
    // Format for week (e.g., "W12")
    week?: (weekNumber: number) => string;
    // Format for day (e.g., "Mon 15")
    day?: (weekday: number, day: number) => string;
  };
}

// English locale (default)
export const enUS: CalendarLocale = {
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  monthsFull: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  weekdaysFull: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  weekAbbr: 'W',
  am: 'AM',
  pm: 'PM',
};

// Finnish locale
export const fiFI: CalendarLocale = {
  monthsShort: ['Tammi', 'Helmi', 'Maalis', 'Huhti', 'Touko', 'Kesä', 'Heinä', 'Elo', 'Syys', 'Loka', 'Marras', 'Joulu'],
  monthsFull: ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'],
  weekdaysShort: ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'],
  weekdaysFull: ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'],
  weekAbbr: 'Vko',
  am: 'AM',
  pm: 'PM',
};

// Default locale
export const defaultLocale = enUS;

/**
 * Get week number helper (ISO 8601)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
