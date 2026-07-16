import { InvoiceFields } from '../invoice-fields';
import { extractSpanishMonthNameDate, normaliseDate } from '../invoice-date';
import { parseSpanishNumber } from '../spanish-number';
import { normaliseTaxId } from '../tax-id';
import { HintAnchorKind, InvoiceHint, LearnableField } from './invoice-hint';

/**
 * The textual anchor `deriveHint` locates for a corrected field, ready to be
 * persisted as (part of) an `InvoiceHint`.
 */
export interface DerivedAnchor {
  anchorKind: HintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
}

const NUMBER_FIELDS: ReadonlySet<LearnableField> = new Set(['amount', 'taxBase', 'taxRate', 'taxAmount']);
const DATE_FIELDS: ReadonlySet<LearnableField> = new Set(['date', 'dueDate']);
// Single-token string fields: the value never contains embedded spaces, so
// only the first whitespace-delimited token after the label is the value.
const TOKEN_STRING_FIELDS: ReadonlySet<LearnableField> = new Set(['issuerTaxId', 'invoiceNumber']);

const HAS_LETTER = /[a-zA-Z]/;
const TRAILING_SEPARATORS = /[\s:.-]+$/;
const LEADING_SEPARATORS = /^[\s:.-]+/;
const TRAILING_PUNCTUATION = /[.,;]+$/;

// A generic numeric token: Spanish thousands/decimal grouping ("1.234,56"),
// plain comma-decimal ("21,50"), dot-decimal ("1234.56") or a bare integer
// ("21", as tax rates are often printed without decimals).
const NUMBER_TOKEN = /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?(?!\d)|-?\d+(?:\.\d+)?/;
const NUMERIC_DATE_TOKEN = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{2}-\d{2})/;

const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function toLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stringRepresentations(field: LearnableField, value: string): string[] {
  const trimmed = value.trim();

  if (field !== 'issuerTaxId') {
    return [trimmed];
  }

  // Real invoices print CIF/NIF tokens with an optional hyphen either after
  // the leading letter ("B-12345678") or before the trailing check letter
  // ("12345678-Z"); try both alongside the plain, hyphen-free form.
  const normalised = normaliseTaxId(trimmed);
  const variants = new Set<string>([normalised]);
  if (normalised.length > 1) {
    variants.add(`${normalised.slice(0, 1)}-${normalised.slice(1)}`);
    variants.add(`${normalised.slice(0, -1)}-${normalised.slice(-1)}`);
  }
  return [...variants];
}

function dateRepresentations(value: string): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return [value.trim()];
  }

  const [, year, month, day] = match;
  const dayNum = Number(day);
  const monthNum = Number(month);
  const monthName = SPANISH_MONTHS[monthNum - 1];

  const representations = [`${day}/${month}/${year}`, `${dayNum}/${monthNum}/${year}`, `${year}-${month}-${day}`];

  if (monthName) {
    representations.push(`${dayNum} de ${monthName} de ${year}`, `${dayNum} ${monthName} ${year}`);
  }

  return representations;
}

function numberRepresentations(value: number): string[] {
  const fixed = value.toFixed(2);
  const [wholeWithSign, decimals] = fixed.split('.');
  const negative = wholeWithSign.startsWith('-');
  const whole = negative ? wholeWithSign.slice(1) : wholeWithSign;
  const sign = negative ? '-' : '';
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const representations = new Set<string>([
    `${sign}${withThousands},${decimals}`,
    `${sign}${whole},${decimals}`,
    `${sign}${whole}.${decimals}`,
  ]);

  // Values with no meaningful decimal part (e.g. a 21% tax rate) are just as
  // often printed without them ("21" rather than "21,00").
  if (decimals === '00') {
    representations.add(`${sign}${whole}`);
    representations.add(`${sign}${withThousands}`);
  }

  return [...representations];
}

function buildRepresentations(field: LearnableField, correctedValue: string | number): string[] {
  if (NUMBER_FIELDS.has(field)) {
    return numberRepresentations(typeof correctedValue === 'number' ? correctedValue : Number(correctedValue));
  }
  if (DATE_FIELDS.has(field)) {
    return dateRepresentations(String(correctedValue));
  }
  return stringRepresentations(field, String(correctedValue));
}

interface Located {
  lineIndex: number;
  matchStart: number;
  matchLength: number;
}

function locate(lines: string[], representations: string[]): Located | null {
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lowerLine = lines[lineIndex].toLowerCase();
    for (const representation of representations) {
      if (!representation) continue;
      const matchStart = lowerLine.indexOf(representation.toLowerCase());
      if (matchStart !== -1) {
        return { lineIndex, matchStart, matchLength: representation.length };
      }
    }
  }
  return null;
}

function findPrecedingLabelledLine(
  lines: string[],
  valueLineIndex: number,
  sampleValue: string,
): DerivedAnchor | null {
  for (let index = valueLineIndex - 1; index >= 0; index--) {
    if (HAS_LETTER.test(lines[index])) {
      return {
        anchorKind: 'preceding-line',
        anchorLabel: lines[index],
        lineOffset: valueLineIndex - index,
        sampleValue,
      };
    }
  }
  return null;
}

/**
 * Locates `correctedValue` in `text` and derives a reusable textual anchor
 * for `field`: a label found before the value on the same line ("inline"),
 * or the nearest preceding line carrying text when the value sits alone on
 * its own line ("preceding-line"). Returns `null` when the value cannot be
 * found in the text at all, or found with no locatable label above/beside
 * it (e.g. it's the very first line of the document).
 */
export function deriveHint(text: string, field: LearnableField, correctedValue: string | number): DerivedAnchor | null {
  const lines = toLines(text);
  const representations = buildRepresentations(field, correctedValue);
  const located = locate(lines, representations);
  if (!located) {
    return null;
  }

  const sampleValue = String(correctedValue);
  const prefix = lines[located.lineIndex].slice(0, located.matchStart);

  if (HAS_LETTER.test(prefix)) {
    const anchorLabel = prefix.replace(TRAILING_SEPARATORS, '').trim();
    if (anchorLabel.length > 0) {
      return { anchorKind: 'inline', anchorLabel, lineOffset: 0, sampleValue };
    }
  }

  return findPrecedingLabelledLine(lines, located.lineIndex, sampleValue);
}

function parseFieldValue(field: LearnableField, raw: string): string | number | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (NUMBER_FIELDS.has(field)) {
    const match = NUMBER_TOKEN.exec(trimmed);
    return match ? (parseSpanishNumber(match[0]) ?? undefined) : undefined;
  }

  if (DATE_FIELDS.has(field)) {
    const monthNameDate = extractSpanishMonthNameDate(trimmed);
    if (monthNameDate) {
      return monthNameDate;
    }
    const numericMatch = NUMERIC_DATE_TOKEN.exec(trimmed);
    return numericMatch ? (normaliseDate(numericMatch[1]) ?? undefined) : undefined;
  }

  if (TOKEN_STRING_FIELDS.has(field)) {
    const tokenMatch = /^\S+/.exec(trimmed);
    if (!tokenMatch) {
      return undefined;
    }
    const token = tokenMatch[0].replace(TRAILING_PUNCTUATION, '');
    return field === 'issuerTaxId' ? normaliseTaxId(token) : token;
  }

  // issuerName: free text, the whole (trimmed) remainder/line is the value.
  const name = trimmed.replace(TRAILING_PUNCTUATION, '').trim();
  return name.length > 0 ? name : undefined;
}

function resolveHintValue(hint: InvoiceHint, lines: string[]): string | number | undefined {
  const labelIndex = lines.findIndex((line) => line.toLowerCase().includes(hint.anchorLabel.toLowerCase()));
  if (labelIndex === -1) {
    return undefined;
  }

  if (hint.anchorKind === 'inline') {
    const line = lines[labelIndex];
    const start = line.toLowerCase().indexOf(hint.anchorLabel.toLowerCase());
    const remainder = line.slice(start + hint.anchorLabel.length).replace(LEADING_SEPARATORS, '');
    return parseFieldValue(hint.field, remainder);
  }

  const valueLineIndex = labelIndex + hint.lineOffset;
  if (valueLineIndex < 0 || valueLineIndex >= lines.length) {
    return undefined;
  }
  return parseFieldValue(hint.field, lines[valueLineIndex]);
}

/**
 * Applies previously learned per-issuer hints on top of a base heuristic
 * extraction, overriding only the fields whose anchor can still be located
 * in `text`. Fields whose anchor cannot be resolved fall back to whatever
 * `baseFields` already had. Never mutates `baseFields`.
 */
export function applyHints(baseFields: InvoiceFields, hints: InvoiceHint[], text: string): InvoiceFields {
  const lines = toLines(text);
  const result: InvoiceFields = { ...baseFields };

  for (const hint of hints) {
    const value = resolveHintValue(hint, lines);
    if (value !== undefined) {
      // Field <-> value type pairing is guaranteed by `parseFieldValue`
      // switching on the same `hint.field`, but TypeScript can't express
      // that correlation across a dynamic key.
      (result as unknown as Record<LearnableField, string | number>)[hint.field] = value;
    }
  }

  return result;
}
