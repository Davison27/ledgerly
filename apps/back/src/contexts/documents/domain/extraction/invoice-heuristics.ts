import { DocumentCurrency } from '../document-currency';
import { InvoiceFields } from './invoice-fields';
import { normaliseDate } from './invoice-date';
import { parseSpanishNumber } from './spanish-number';

export interface HeuristicExtraction {
  fields: InvoiceFields;
  warnings: string[];
}

const CIF_NIF_TOKEN = /\b([A-Z]\d{7}[0-9A-J]|\d{8}[A-Z])\b/i;
const CIF_NIF_LABEL = /\b(cif|nif)\b/i;
const CUSTOMER_LABEL = /\b(cliente|comprador|destinatario|receptor)\b/i;

const DATE_VALUE = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{2}-\d{2})/;
const FECHA_LABEL = /\bfecha\b/i;
const VENCIMIENTO_LABEL = /vencimiento/i;

const INVOICE_NUMBER_PATTERNS: RegExp[] = [
  /n[uú]mero\s+de\s+factura\s*:?\s*([A-Za-z0-9][\w\-/.]*)/i,
  /factura\s*n[ºo]\.?\s*:?\s*([A-Za-z0-9][\w\-/.]*)/i,
  /n[ºo]\.?\s*factura\s*:?\s*([A-Za-z0-9][\w\-/.]*)/i,
  /\bfactura\b\s*:\s*([A-Za-z0-9][\w\-/.]*)/i,
];

const TOTAL_LABEL = /\btotal\b/i;
const SUBTOTAL_LABEL = /\bsubtotal\b/i;
const BASE_IMPONIBLE_LABEL = /base\s+imponible/i;
const IVA_LABEL = /\biva\b/i;
const IVA_RATE = /iva[^%\d]{0,15}(\d{1,2}(?:[.,]\d+)?)\s*%/i;
const RATE_TOKEN = /\d{1,2}(?:[.,]\d+)?\s*%/;

const AMOUNT_TOKEN = /\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+\.\d{1,2}/g;

const NON_ISSUER_LINE = /^(factura|fecha|cif|nif|n[ºo]\.?|n[uú]mero|cliente|total|subtotal|base|iva|concepto)\b/i;

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

function extractIssuerTaxId(lines: string[]): string | undefined {
  const labelled = lines.filter((line) => CIF_NIF_LABEL.test(line));
  const preferred = labelled.filter((line) => !CUSTOMER_LABEL.test(line));

  for (const line of preferred) {
    const match = CIF_NIF_TOKEN.exec(line);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  for (const line of labelled) {
    const match = CIF_NIF_TOKEN.exec(line);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

function extractInvoiceNumber(lines: string[]): string | undefined {
  for (const line of lines) {
    for (const pattern of INVOICE_NUMBER_PATTERNS) {
      const match = pattern.exec(line);
      if (match) {
        return match[1].replace(/[.,;]+$/, '').trim();
      }
    }
  }
  return undefined;
}

function extractDate(lines: string[]): string | undefined {
  for (const line of lines) {
    if (!FECHA_LABEL.test(line) || VENCIMIENTO_LABEL.test(line)) {
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

function extractTotal(lines: string[]): number | undefined {
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

function extractTaxBase(lines: string[]): number | undefined {
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

function extractTax(lines: string[]): { taxRate?: number; taxAmount?: number } {
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

function extractIssuerName(lines: string[]): string | undefined {
  for (const line of lines) {
    if (line.length < 3) continue;
    if (NON_ISSUER_LINE.test(line)) continue;
    if (DATE_VALUE.test(line)) continue;
    if (CIF_NIF_TOKEN.test(line)) continue;
    return line;
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

  const issuerTaxId = extractIssuerTaxId(lines);
  if (!issuerTaxId) warnings.push('No se pudo determinar el NIF/CIF del emisor');

  const invoiceNumber = extractInvoiceNumber(lines);
  if (!invoiceNumber) warnings.push('No se pudo determinar el número de factura');

  const date = extractDate(lines);
  if (!date) warnings.push('No se pudo determinar la fecha de la factura');

  const dueDate = extractDueDate(lines);

  const amount = extractTotal(lines);
  if (amount == null) warnings.push('No se pudo determinar el importe total');

  const taxBase = extractTaxBase(lines);
  const { taxRate, taxAmount } = extractTax(lines);

  const currency = detectCurrency(text) ?? (amount != null ? 'EUR' : undefined);

  // Only trust the "first plausible line" heuristic for the issuer name when
  // at least one other invoice-like field was found; otherwise a random
  // block of text would always yield a bogus issuer name.
  const hasOtherEvidence = issuerTaxId != null || invoiceNumber != null || date != null || amount != null;
  const issuerName = hasOtherEvidence ? extractIssuerName(lines) : undefined;
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
