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

// Matches Spanish long-form dates such as "30_Junio_2026", "30 de junio de
// 2026", "30 junio 2026" or "30-junio-2026" (case-insensitive, separator can
// be a space, underscore or hyphen, and the "de" connectors are optional).
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

/**
 * Normalises a date expressed as `YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`,
 * `DD-MM-YYYY` or `DD.MM.YYYY` into `YYYY-MM-DD`. Returns `null` when the
 * input does not match a known pattern or is not a valid calendar date.
 */
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

/**
 * Normalises a compact `YYYYMMDD` date (as used by the UN/CEFACT
 * `format="102"` qualifier in Factur-X/ZUGFeRD) into `YYYY-MM-DD`.
 */
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

/**
 * Best-effort normalisation that tries the compact `YYYYMMDD` format first
 * (common in CII/Factur-X payloads) and falls back to the general date
 * formats used in ISO dates and Spanish plain-text invoices.
 */
export function normaliseAnyDate(raw: string | null | undefined): string | null {
  return normaliseCompactDate(raw) ?? normaliseDate(raw);
}

/**
 * Finds and normalises the first Spanish long-form date (day + month name +
 * year, e.g. "30_Junio_2026" or "30 de junio de 2026") found in `text`.
 * Returns `null` when no such date is present or it is not a valid calendar
 * date.
 */
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
