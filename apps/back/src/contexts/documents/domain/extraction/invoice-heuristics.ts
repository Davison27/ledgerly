import { DocumentCurrency } from '../document-currency';
import { InvoiceFields } from './invoice-fields';
import { extractSpanishMonthNameDate, normaliseDate } from './invoice-date';
import { extractSpanishMoneyAmounts, parseSpanishNumber } from './spanish-number';

export interface HeuristicExtraction {
  fields: InvoiceFields;
  warnings: string[];
}

const CIF_NIF_TOKEN = /\b([A-Z]-?\d{7}[0-9A-J]|\d{8}-?[A-Z])\b/i;
const CUSTOMER_LABEL = /\b(cliente|comprador|destinatario|receptor)\b/i;
const CLIENT_PROXIMITY_CAP = 20;
const CLIENT_NAME_EXCLUSION_WINDOW = 2;

const DATE_VALUE = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{2}-\d{2})/;
const FECHA_LABEL = /\bfecha\b/i;
const VENCIMIENTO_LABEL = /vencimiento/i;
const DATE_RANGE_LINE = /\d{1,2}\s*-\s*\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{4}/;
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
const IRPF_LABEL = /\b(irpf|retenci[oó]n(?:es)?)\b/i;
const IRPF_RATE = /(?:irpf|retenci[oó]n(?:es)?)[^%\d]{0,15}(\d{1,2}(?:[.,]\d+)?)\s*%/i;
const RATE_TOKEN = /\d{1,2}(?:[.,]\d+)?\s*%/;

const AMOUNT_TOKEN = /\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+\.\d{1,2}/g;

const NON_ISSUER_LINE = /^(factura|fecha|cif|nif|n[ºo]\.?|n[uú]mero|cliente|total|subtotal|base|iva|concepto)\b/i;
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

function extractLabelledIrpf(lines: string[]): { irpfRate?: number; irpfAmount?: number } {
  for (const line of lines) {
    if (!IRPF_LABEL.test(line)) {
      continue;
    }
    const rateMatch = IRPF_RATE.exec(line);
    const irpfRate = rateMatch ? (parseSpanishNumber(rateMatch[1]) ?? undefined) : undefined;
    const irpfAmount = lastAmountInLine(line, true) ?? undefined;

    if (irpfRate != null || irpfAmount != null) {
      return { irpfRate, irpfAmount };
    }
  }
  return {};
}

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

  const labelledIrpf = extractLabelledIrpf(lines);
  const irpfRate = labelledIrpf.irpfRate;
  const irpfAmount = labelledIrpf.irpfAmount;

  const currency = detectCurrency(text) ?? (amount != null ? 'EUR' : undefined);

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
  if (irpfRate != null) fields.irpfRate = irpfRate;
  if (irpfAmount != null) fields.irpfAmount = irpfAmount;
  if (amount != null) fields.amount = amount;

  return { fields, warnings };
}
