import { createHash } from 'node:crypto';
import type { TaxSourceEvent } from '../../domain/tax-source-event';

const MAX_EVENTS = 5_000;
const MAX_UID_LENGTH = 240;
const MAX_SUMMARY_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 4_000;

function unfoldLines(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded: string[] = [];

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  return unfolded;
}

function unescapeValue(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\([\\,;])/g, '$1')
    .trim();
}

function limit(value: string | null, maxLength: number): string | null {
  if (value === null) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function propertyValue(line: string): { key: string; value: string } | null {
  const separator = line.indexOf(':');
  if (separator < 0) return null;

  return {
    key: line.slice(0, separator).split(';', 1)[0].toUpperCase(),
    value: unescapeValue(line.slice(separator + 1)),
  };
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/[-:]/g, '');
  if (!/^\d{8}/.test(compact)) return null;

  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function parseTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/[-:]/g, '');
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(compact);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, utc] = match;
  const date = utc
    ? new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        ),
      )
    : new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      );

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseEvent(lines: string[]): TaxSourceEvent | null {
  const properties = new Map<string, string>();
  for (const line of lines) {
    const property = propertyValue(line);
    if (property) properties.set(property.key, property.value);
  }

  const summary = limit(properties.get('SUMMARY')?.trim() ?? null, MAX_SUMMARY_LENGTH);
  if (!summary) return null;

  const rawUid = properties.get('UID')?.trim();
  const uid =
    limit(rawUid || createHash('sha256').update(lines.join('\n')).digest('hex'), MAX_UID_LENGTH) ??
    '';

  return {
    uid,
    summary,
    description: limit(properties.get('DESCRIPTION')?.trim() || null, MAX_DESCRIPTION_LENGTH),
    startDate: parseDate(properties.get('DTSTART')),
    endDate: parseDate(properties.get('DTEND')),
    lastModified: parseTimestamp(properties.get('LAST-MODIFIED') ?? properties.get('DTSTAMP')),
  };
}

export function parseIcalEvents(raw: string): TaxSourceEvent[] {
  if (!raw.includes('BEGIN:VCALENDAR')) {
    throw new Error('The source is not an iCalendar document');
  }

  const events: TaxSourceEvent[] = [];
  let current: string[] | null = null;

  for (const line of unfoldLines(raw)) {
    if (line === 'BEGIN:VEVENT') {
      if (current) throw new Error('Invalid iCalendar: nested event');
      current = [];
      continue;
    }

    if (line === 'END:VEVENT') {
      if (!current) throw new Error('Invalid iCalendar: event without start');
      const event = parseEvent(current);
      if (event) events.push(event);
      if (events.length > MAX_EVENTS)
        throw new Error('The iCalendar document contains too many events');
      current = null;
      continue;
    }

    if (current) current.push(line);
  }

  if (current) throw new Error('Invalid iCalendar: event without end');
  if (events.length === 0) throw new Error('The iCalendar document contains no events');

  return [...events].sort((a, b) => a.uid.localeCompare(b.uid));
}
