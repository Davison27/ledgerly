import { DocumentCurrency } from '../document-currency';
import { InvoiceFields } from './invoice-fields';
import { extractSpanishMonthNameDate, normaliseDate } from './invoice-date';
import { extractSpanishMoneyAmounts, parseSpanishNumber } from './spanish-number';

export interface HeuristicExtraction {
  fields: InvoiceFields;
  warnings: string[];
}

// CIF (letter + 7 digits + check digit/letter) and DNI/NIE (8 digits +
// letter) tax ids, with an optional hyphen after the leading letter (CIF) or
// before the trailing check letter (DNI), as commonly printed on invoices
// ("B-12345678", "12345678-Z").
const CIF_NIF_TOKEN = /\b([A-Z]-?\d{7}[0-9A-J]|\d{8}-?[A-Z])\b/i;
const CUSTOMER_LABEL = /\b(cliente|comprador|destinatario|receptor)\b/i;
// A tax id occurrence is only ever treated as belonging to the client when
// the nearest "cliente"-like line is within this many lines; beyond that we
// assume proximity is coincidental.
const CLIENT_PROXIMITY_CAP = 20;
// How far (in lines) a plausible issuer-name line may be considered "too
// close to the client block" to be trusted.
const CLIENT_NAME_EXCLUSION_WINDOW = 2;

const DATE_VALUE = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{2}-\d{2})/;
const FECHA_LABEL = /\bfecha\b/i;
const VENCIMIENTO_LABEL = /vencimiento/i;
// A day-day/month/year span such as "9-10/5/2026" describes a work period,
// not the invoice date; lines matching this are excluded from date
// candidates entirely, numeric or Spanish long-form alike.
const DATE_RANGE_LINE = /\d{1,2}\s*-\s*\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{4}/;
// How far (in lines) a standalone date value may be from a "fecha" label and
// still be considered "adjacent" to it.
const DATE_LABEL_PROXIMITY_WINDOW = 2;

const INVOICE_NUMBER_PATTERNS: RegExp[] = [
  /n[uú]mero\s+de\s+factura\s*:?\s*([A-Za-z0-9][\w\-/.]*)/i,
  /factura\s*n[º°o.]{0,3}\s*:?\s*([A-Za-z0-9][\w\-/.]*)/i,
  /n[º°o.]{0,3}\s*factura\s*:?\s*([A-Za-z0-9][\w\-/.]*)/i,
  /\bfactura\b\s*:?\s*([A-Za-z0-9][\w\-/.]*)/i,
];

const TOTAL_LABEL = /\btotal\b/i;
const SUBTOTAL_LABEL = /\bsubtotal\b/i;
const BASE_IMPONIBLE_LABEL = /base\s+imponible/i;
const IVA_LABEL = /\biva\b/i;
const IVA_RATE = /iva[^%\d]{0,15}(\d{1,2}(?:[.,]\d+)?)\s*%/i;
const RATE_TOKEN = /\d{1,2}(?:[.,]\d+)?\s*%/;

const AMOUNT_TOKEN = /\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+\.\d{1,2}/g;

const NON_ISSUER_LINE = /^(factura|fecha|cif|nif|n[ºo]\.?|n[uú]mero|cliente|total|subtotal|base|iva|concepto)\b/i;
// A line that starts with a lower-case letter almost always continues the
// previous line (e.g. a wrapped company name/address), rather than starting
// a new plausible issuer-name line.
const STARTS_LOWERCASE = /^[a-záéíóúñü]/;

interface TaxIdOccurrence {
  index: number;
  value: string;
}

function lastAmountInLine(line: string, excludeRate = false): number | null {
  const withoutRate = excludeRate ? line.replace(RATE_TOKEN, '') : line;
  const matches = withoutRate.match(AMOUNT_TOKEN);
  if (!matches || matches.length === 0) {
    return null;
  }
  return parseSpanishNumber(matches[matches.length - 1]);
}

function detectCurrency(text: string): DocumentCurrency | undefined {
  if (/EUR|€/.test(text)) return 'EUR';
  if (/USD|\$/.test(text)) return 'USD';
  if (/GBP|£/.test(text)) return 'GBP';
  return undefined;
}

function findAllTaxIds(lines: string[]): TaxIdOccurrence[] {
  const found: TaxIdOccurrence[] = [];
  lines.forEach((line, index) => {
    const match = CIF_NIF_TOKEN.exec(line);
    if (match) {
      found.push({ index, value: match[1].toUpperCase().replace(/-/g, '') });
    }
  });
  return found;
}

function findClienteLineIndexes(lines: string[]): number[] {
  const indexes: number[] = [];
  lines.forEach((line, index) => {
    if (CUSTOMER_LABEL.test(line)) indexes.push(index);
  });
  return indexes;
}

/**
 * Determines the issuer's tax id (and the line it was found on) among all
 * CIF/NIF-like tokens in the document. The token whose line sits closest to
 * a "cliente"/"comprador"/... label is assumed to belong to the client and
 * is excluded; the first remaining token, in document order, is the issuer's.
 */
function extractIssuerTaxId(
  lines: string[],
  clienteLineIndexes: number[],
): { value: string; lineIndex: number } | undefined {
  const taxIds = findAllTaxIds(lines);
  if (taxIds.length === 0) return undefined;

  let clientTaxIdValue: string | undefined;
  if (clienteLineIndexes.length > 0) {
    let minDistance = Infinity;
    for (const taxId of taxIds) {
      const distance = Math.min(...clienteLineIndexes.map((ci) => Math.abs(taxId.index - ci)));
      if (distance < minDistance) {
        minDistance = distance;
        clientTaxIdValue = taxId.value;
      }
    }
    if (minDistance > CLIENT_PROXIMITY_CAP) {
      clientTaxIdValue = undefined;
    }
  }

  const nonClient = taxIds.find((taxId) => taxId.value !== clientTaxIdValue);
  return nonClient ? { value: nonClient.value, lineIndex: nonClient.index } : undefined;
}

function extractInvoiceNumber(lines: string[]): string | undefined {
  for (const line of lines) {
    for (const pattern of INVOICE_NUMBER_PATTERNS) {
      const match = pattern.exec(line);
      if (match) {
        const token = match[1].replace(/[.,;]+$/, '').trim();
        if (/\d/.test(token)) {
          return token;
        }
      }
    }
  }
  return undefined;
}

interface DateCandidate {
  index: number;
  value: string;
}

function collectDateCandidates(lines: string[]): DateCandidate[] {
  const candidates: DateCandidate[] = [];
  lines.forEach((line, index) => {
    if (DATE_RANGE_LINE.test(line)) return;

    const monthNameDate = extractSpanishMonthNameDate(line);
    if (monthNameDate) {
      candidates.push({ index, value: monthNameDate });
      return;
    }

    const numericMatch = DATE_VALUE.exec(line);
    if (numericMatch) {
      const normalised = normaliseDate(numericMatch[1]);
      if (normalised) {
        candidates.push({ index, value: normalised });
      }
    }
  });
  return candidates;
}

/**
 * Picks the invoice date among all date-like candidates in the document.
 * Prefers a candidate adjacent (same line, or within a couple of lines) to
 * a "fecha" label that isn't about a due date; otherwise falls back to the
 * first plausible date found.
 */
function extractDate(lines: string[]): string | undefined {
  const candidates = collectDateCandidates(lines);
  if (candidates.length === 0) return undefined;

  const labelIndexes: number[] = [];
  lines.forEach((line, index) => {
    if (FECHA_LABEL.test(line) && !VENCIMIENTO_LABEL.test(line)) labelIndexes.push(index);
  });

  if (labelIndexes.length > 0) {
    let best: { value: string; distance: number } | undefined;
    for (const candidate of candidates) {
      const distance = Math.min(...labelIndexes.map((li) => Math.abs(candidate.index - li)));
      if (distance <= DATE_LABEL_PROXIMITY_WINDOW && (best == null || distance < best.distance)) {
        best = { value: candidate.value, distance };
      }
    }
    if (best) return best.value;
  }

  return candidates[0].value;
}

function extractDueDate(lines: string[]): string | undefined {
  for (const line of lines) {
    if (!VENCIMIENTO_LABEL.test(line)) {
      continue;
    }
    const match = DATE_VALUE.exec(line);
    if (match) {
      const normalised = normaliseDate(match[1]);
      if (normalised) {
        return normalised;
      }
    }
  }
  return undefined;
}

function extractLabelledTotal(lines: string[]): number | undefined {
  let best: number | undefined;
  for (const line of lines) {
    if (!TOTAL_LABEL.test(line) || SUBTOTAL_LABEL.test(line)) {
      continue;
    }
    const value = lastAmountInLine(line);
    if (value != null && (best == null || value > best)) {
      best = value;
    }
  }
  return best;
}

/**
 * Total, falling back to the largest monetary amount found anywhere in the
 * document when no line carries both a "total" label and an inline amount
 * (e.g. the label and the value sit in separate table columns/lines). The
 * grand total is always the largest single amount on a well-formed invoice,
 * so this is a robust general fallback.
 */
function extractTotal(lines: string[], text: string): number | undefined {
  const labelled = extractLabelledTotal(lines);
  if (labelled != null) return labelled;

  const amounts = extractSpanishMoneyAmounts(text).filter((value) => value >= 0);
  if (amounts.length === 0) return undefined;
  return Math.max(...amounts);
}

function extractLabelledTaxBase(lines: string[]): number | undefined {
  for (const line of lines) {
    if (!BASE_IMPONIBLE_LABEL.test(line)) {
      continue;
    }
    const value = lastAmountInLine(line);
    if (value != null) {
      return value;
    }
  }
  return undefined;
}

function extractLabelledTax(lines: string[]): { taxRate?: number; taxAmount?: number } {
  for (const line of lines) {
    if (!IVA_LABEL.test(line)) {
      continue;
    }
    const rateMatch = IVA_RATE.exec(line);
    const taxRate = rateMatch ? (parseSpanishNumber(rateMatch[1]) ?? undefined) : undefined;
    const taxAmount = lastAmountInLine(line, true) ?? undefined;

    if (taxRate != null || taxAmount != null) {
      return { taxRate, taxAmount };
    }
  }
  return {};
}

/**
 * Finds a (base, tax) pair among all monetary amounts in the document such
 * that `base * rate/100 ≈ tax`. Self-validates against the known tax rate,
 * so it works even when the "base imponible"/"IVA" labels and their values
 * are printed in separate columns rather than on the same line. When
 * several pairs satisfy the equation, the one whose base differs from the
 * total is preferred (the total itself can coincidentally satisfy the
 * equation for unrelated reasons).
 */
function findTaxRatioPair(
  amounts: number[],
  rate: number,
  total: number | undefined,
): { taxBase: number; taxAmount: number } | undefined {
  const TOLERANCE = 0.02;
  let preferred: { taxBase: number; taxAmount: number } | undefined;
  let fallback: { taxBase: number; taxAmount: number } | undefined;

  for (const base of amounts) {
    if (base <= 0) continue;
    const expected = (base * rate) / 100;
    for (const candidate of amounts) {
      if (candidate === base || candidate <= 0) continue;
      if (Math.abs(expected - candidate) <= TOLERANCE) {
        const pair = { taxBase: base, taxAmount: candidate };
        const isTotal = total != null && Math.abs(base - total) <= 0.01;
        if (!isTotal) {
          if (!preferred) preferred = pair;
        } else if (!fallback) {
          fallback = pair;
        }
      }
    }
  }

  return preferred ?? fallback;
}

function extractIssuerName(
  lines: string[],
  issuerTaxIdLineIndex: number | undefined,
  clienteLineIndexes: number[],
): string | undefined {
  const isClientProximate = (index: number) =>
    clienteLineIndexes.some((ci) => Math.abs(index - ci) <= CLIENT_NAME_EXCLUSION_WINDOW);

  const isPlausibleIssuerLine = (index: number): boolean => {
    const line = lines[index];
    if (line.length < 3) return false;
    if (NON_ISSUER_LINE.test(line)) return false;
    if (DATE_VALUE.test(line)) return false;
    if (CIF_NIF_TOKEN.test(line)) return false;
    if (/\d/.test(line)) return false;
    if (STARTS_LOWERCASE.test(line)) return false;
    if (isClientProximate(index)) return false;
    return true;
  };

  // Prefer a plausible line near the issuer's own tax id: real invoices
  // almost always print the issuer's name close to their CIF/NIF.
  if (issuerTaxIdLineIndex != null) {
    for (let distance = 0; distance <= 5; distance++) {
      const before = issuerTaxIdLineIndex - distance;
      if (before >= 0 && isPlausibleIssuerLine(before)) {
        return lines[before];
      }
      if (distance > 0) {
        const after = issuerTaxIdLineIndex + distance;
        if (after < lines.length && isPlausibleIssuerLine(after)) {
          return lines[after];
        }
      }
    }
  }

  for (let index = 0; index < lines.length; index++) {
    if (isPlausibleIssuerLine(index)) {
      return lines[index];
    }
  }
  return undefined;
}

/**
 * Best-effort extraction of Spanish invoice fields from the plain text
 * layer of a PDF, using label-driven regular expressions. Fields that
 * cannot be determined with reasonable confidence are omitted.
 */
export function extractInvoiceHeuristics(text: string): HeuristicExtraction {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const warnings: string[] = [];

  const clienteLineIndexes = findClienteLineIndexes(lines);

  const issuer = extractIssuerTaxId(lines, clienteLineIndexes);
  const issuerTaxId = issuer?.value;
  if (!issuerTaxId) warnings.push('No se pudo determinar el NIF/CIF del emisor');

  const invoiceNumber = extractInvoiceNumber(lines);
  if (!invoiceNumber) warnings.push('No se pudo determinar el número de factura');

  const date = extractDate(lines);
  if (!date) warnings.push('No se pudo determinar la fecha de la factura');

  const dueDate = extractDueDate(lines);

  const amount = extractTotal(lines, text);
  if (amount == null) warnings.push('No se pudo determinar el importe total');

  let taxBase = extractLabelledTaxBase(lines);
  const labelledTax = extractLabelledTax(lines);
  const taxRate = labelledTax.taxRate;
  let taxAmount = labelledTax.taxAmount;

  if (taxRate != null && (taxBase == null || taxAmount == null)) {
    const amounts = extractSpanishMoneyAmounts(text).filter((value) => value > 0);
    const pair = findTaxRatioPair(amounts, taxRate, amount);
    if (pair) {
      if (taxBase == null) taxBase = pair.taxBase;
      if (taxAmount == null) taxAmount = pair.taxAmount;
    }
  }

  const currency = detectCurrency(text) ?? (amount != null ? 'EUR' : undefined);

  // Only trust the "plausible line" heuristic for the issuer name when at
  // least one other invoice-like field was found; otherwise a random block
  // of text would always yield a bogus issuer name.
  const hasOtherEvidence = issuerTaxId != null || invoiceNumber != null || date != null || amount != null;
  const issuerName = hasOtherEvidence ? extractIssuerName(lines, issuer?.lineIndex, clienteLineIndexes) : undefined;
  if (!issuerName) warnings.push('No se pudo determinar el nombre del emisor');

  const fields: InvoiceFields = {};
  if (issuerName) fields.issuerName = issuerName;
  if (issuerTaxId) fields.issuerTaxId = issuerTaxId;
  if (invoiceNumber) fields.invoiceNumber = invoiceNumber;
  if (date) fields.date = date;
  if (dueDate) fields.dueDate = dueDate;
  if (currency) fields.currency = currency;
  if (taxBase != null) fields.taxBase = taxBase;
  if (taxRate != null) fields.taxRate = taxRate;
  if (taxAmount != null) fields.taxAmount = taxAmount;
  if (amount != null) fields.amount = amount;

  return { fields, warnings };
}
