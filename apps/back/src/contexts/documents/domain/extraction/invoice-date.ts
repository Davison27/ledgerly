const ISO_DATE = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
const EUROPEAN_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;
const COMPACT_DATE = /^(\d{4})(\d{2})(\d{2})$/;

const SPANISH_MONTH_NAMES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const MONTH_NAME_ALTERNATION = Object.keys(SPANISH_MONTH_NAMES).join('|');

const SPANISH_MONTH_NAME_DATE = new RegExp(
  `\\b(\\d{1,2})[\\s_-]+(?:de[\\s_-]+)?(${MONTH_NAME_ALTERNATION})[\\s_-]+(?:de[\\s_-]+)?(\\d{4})\\b`,
  'i',
);

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normaliseDate(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const isoMatch = ISO_DATE.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (!isValidCalendarDate(Number(year), Number(month), Number(day))) {
      return null;
    }
    return `${year}-${month}-${day}`;
  }

  const europeanMatch = EUROPEAN_DATE.exec(trimmed);
  if (europeanMatch) {
    const [, day, month, year] = europeanMatch;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    if (!isValidCalendarDate(Number(year), Number(paddedMonth), Number(paddedDay))) {
      return null;
    }
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return null;
}

export function normaliseCompactDate(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  const match = COMPACT_DATE.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  if (!isValidCalendarDate(Number(year), Number(month), Number(day))) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export function normaliseAnyDate(raw: string | null | undefined): string | null {
  return normaliseCompactDate(raw) ?? normaliseDate(raw);
}

export function extractSpanishMonthNameDate(text: string): string | null {
  const match = SPANISH_MONTH_NAME_DATE.exec(text);
  if (!match) {
    return null;
  }

  const [, day, monthName, year] = match;
  const month = SPANISH_MONTH_NAMES[monthName.toLowerCase()];
  if (!month) {
    return null;
  }

  const paddedDay = day.padStart(2, '0');
  const paddedMonth = String(month).padStart(2, '0');

  if (!isValidCalendarDate(Number(year), month, Number(day))) {
    return null;
  }

  return `${year}-${paddedMonth}-${paddedDay}`;
}
