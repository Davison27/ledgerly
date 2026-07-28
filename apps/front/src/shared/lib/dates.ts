export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    parseIsoDate(date),
  );
}

export function formatDateRange(start: string, end: string, locale: string): string {
  if (start === end) return formatDate(start, locale);

  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  if (typeof formatter.formatRange === 'function') {
    return formatter.formatRange(parseIsoDate(start), parseIsoDate(end));
  }

  return `${formatDate(start, locale)} – ${formatDate(end, locale)}`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export function formatRelativeTime(value: Date, locale: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = value.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  if (absMs < HOUR_MS) return formatter.format(Math.round(diffMs / MINUTE_MS), 'minute');
  if (absMs < DAY_MS) return formatter.format(Math.round(diffMs / HOUR_MS), 'hour');
  if (absMs < WEEK_MS) return formatter.format(Math.round(diffMs / DAY_MS), 'day');
  return formatter.format(Math.round(diffMs / WEEK_MS), 'week');
}
