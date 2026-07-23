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
