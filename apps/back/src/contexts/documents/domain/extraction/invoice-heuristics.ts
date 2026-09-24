import { DocumentCurrency } from '../document-currency';
import { InvoiceFields } from './invoice-fields';
import { extractSpanishMonthNameDate, isPlausibleInvoiceDate, normaliseDate } from './invoice-date';
import { parseSpanishNumber } from './spanish-number';
import { canonicalSpanishTaxId, findSpanishTaxIds } from './tax-id';
import { findLabelledValues, linesFromText } from './text-lines';
import { PdfTextCell, PdfTextLine } from './pdf-reader.port';
import type { ExtractionWarningCode } from './extraction-warning-code';

export interface HeuristicExtraction {
  fields: InvoiceFields;
  warnings: ExtractionWarningCode[];
}

export interface HeuristicContext {
  excludedTaxIds?: string[];
}

const CUSTOMER_LABEL = /\b(cliente|comprador|destinatario|receptor)\b/i;
const CLIENT_PROXIMITY_CAP = 20;
const CLIENT_BLOCK_LOOKAHEAD_LINES = 6;
const ISSUER_NAME_SEARCH_WINDOW = 5;
const HORIZONTAL_PROXIMITY_HEIGHT_MULTIPLIER = 2;

const DATE_VALUE = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{2}-\d{2})/;
const FECHA_LABEL = /\bfecha\b(?!\s*(de\s+)?vencimiento)/i;
const VENCIMIENTO_LABEL = /vencimiento/i;
const DATE_RANGE_LINE = /\d{1,2}\s*-\s*\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{4}/;

const INVOICE_NUMBER_LABEL =
  /n[uú]mero\s+de\s+factura|factura\s*n[º°o.]{0,3}|n[º°o.]{0,3}\s*factura|\bfactura\b/i;

const TOTAL_LABEL_P3 = /total\s+a\s+pagar|l[ií]quido\s+a\s+percibir|importe\s+a\s+pagar|total\s+a\s+abonar/i;
const TOTAL_LABEL_P2 = /total\s+factura|importe\s+total|total\s+con\s+iva|total\s+eur|total\s*€/i;
const TOTAL_LABEL_P1 = /\btotal\b(?!\s*\(?(bruto|base|iva|sin|antes))/i;
const BASE_IMPONIBLE_LABEL = /base\s+imponible/i;
const IVA_LABEL = /\biva\b/i;
const IRPF_LABEL = /\b(irpf|retenci[oó]n(?:es)?)\b/i;
const RATE_TOKEN = /\d{1,2}(?:[.,]\d+)?\s*%/g;
const RATE_VALUE = /(\d{1,2}(?:[.,]\d+)?)\s*%/;

const MONEY_VALUE =
  /-?\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)(?!\s*%)|-?\d+\.\d{2}(?!\d)(?!\s*%)|(?:€|EUR)\s*-?\d+(?!\d)|-?\d+(?!\d)\s*(?:€|EUR)/gi;

const NON_ISSUER_LINE = /^(factura|fecha|cif|nif|n[ºo]\.?|n[uú]mero|cliente|total|subtotal|base|iva|concepto)\b/i;
const STARTS_LOWERCASE = /^[a-záéíóúñü]/;
const POSTCODE_LINE = /^\d{5}\b/;
const ADDRESS_CONTACT_TOKENS = /\b(calle|c\/|avda|avenida|plaza|tel|tlf|email|www|@)\b/i;
const LEGAL_FORM_SUFFIX = /\b(S\.?\s?L\.?\s?U?|S\.?\s?A\.?\s?U?|S\.?\s?COOP|S\.?\s?L\.?\s?L|C\.?\s?B\.?)\b/i;

function cellKey(lineIndex: number, cellIndex: number): string {
  return `${lineIndex}:${cellIndex}`;
}

function cellsOverlapHorizontally(label: PdfTextCell, candidate: PdfTextCell, labelHeight: number): boolean {
  const withinProximity = Math.abs(candidate.x - label.x) <= labelHeight * HORIZONTAL_PROXIMITY_HEIGHT_MULTIPLIER;
  const labelEnd = label.x + label.width;
  const candidateEnd = candidate.x + candidate.width;
  const rangesOverlap = candidate.x <= labelEnd && candidateEnd >= label.x;
  return withinProximity || rangesOverlap;
}

function detectCurrency(lines: PdfTextLine[]): DocumentCurrency | undefined {
  const flatText = lines.flatMap((line) => line.cells.map((cell) => cell.text)).join(' ');
  if (/EUR|€/.test(flatText)) return 'EUR';
  if (/USD|\$/.test(flatText)) return 'USD';
  if (/GBP|£/.test(flatText)) return 'GBP';
  return undefined;
}

function parseMoneyToken(raw: string): number | undefined {
  const cleaned = raw.replace(/€|EUR/gi, '').trim();
  return parseSpanishNumber(cleaned) ?? undefined;
}

function findMoneyAmounts(text: string): number[] {
  const matches = text.match(MONEY_VALUE) ?? [];
  return matches.map(parseMoneyToken).filter((value): value is number => value != null);
}

function lastMoneyAmount(text: string, excludeRate = false): number | undefined {
  const source = excludeRate ? text.replace(RATE_TOKEN, '') : text;
  const amounts = findMoneyAmounts(source);
  return amounts.length > 0 ? amounts[amounts.length - 1] : undefined;
}

function parseRateValue(cellText: string): number | undefined {
  const match = RATE_VALUE.exec(cellText);
  return match ? (parseSpanishNumber(match[1]) ?? undefined) : undefined;
}

function parseInvoiceNumberValue(cellText: string): string | undefined {
  const trimmed = cellText.replace(/^[\s:.-]+/, '');
  const match = /^([A-Za-z0-9][\w\-/.]*)/.exec(trimmed);
  if (!match) return undefined;
  const token = match[1].replace(/[.,;]+$/, '');
  return /\d/.test(token) ? token : undefined;
}

function parseDateCellValue(cellText: string): string | undefined {
  if (DATE_RANGE_LINE.test(cellText)) return undefined;

  const monthNameDate = extractSpanishMonthNameDate(cellText);
  if (monthNameDate && isPlausibleInvoiceDate(monthNameDate)) return monthNameDate;

  const numericMatch = DATE_VALUE.exec(cellText);
  if (numericMatch) {
    const normalised = normaliseDate(numericMatch[1]);
    if (normalised && isPlausibleInvoiceDate(normalised)) return normalised;
  }
  return undefined;
}

interface TaxIdCellMatch {
  value: string;
  lineIndex: number;
  cellIndex: number;
  checksumValid: boolean;
}

function findAllTaxIdCells(lines: PdfTextLine[]): TaxIdCellMatch[] {
  const found: TaxIdCellMatch[] = [];
  lines.forEach((line, lineIndex) => {
    line.cells.forEach((cell, cellIndex) => {
      for (const match of findSpanishTaxIds(cell.text)) {
        found.push({ value: match.value, lineIndex, cellIndex, checksumValid: match.checksumValid });
      }
    });
  });
  return found;
}

function computeClientBlockCells(lines: PdfTextLine[], useDistanceFallback: boolean): Set<string> {
  const blocked = new Set<string>();

  if (useDistanceFallback) {
    const clienteLineIndexes: number[] = [];
    lines.forEach((line, lineIndex) => {
      if (CUSTOMER_LABEL.test(line.cells[0]?.text ?? '')) clienteLineIndexes.push(lineIndex);
    });
    if (clienteLineIndexes.length === 0) return blocked;

    const taxIdCells = findAllTaxIdCells(lines);
    let nearest: { lineIndex: number; cellIndex: number; distance: number } | undefined;
    for (const cell of taxIdCells) {
      const distance = Math.min(...clienteLineIndexes.map((ci) => Math.abs(cell.lineIndex - ci)));
      if (!nearest || distance < nearest.distance) {
        nearest = { lineIndex: cell.lineIndex, cellIndex: cell.cellIndex, distance };
      }
    }
    if (nearest && nearest.distance <= CLIENT_PROXIMITY_CAP) {
      blocked.add(cellKey(nearest.lineIndex, nearest.cellIndex));
    }
    return blocked;
  }

  lines.forEach((line, lineIndex) => {
    line.cells.forEach((cell, cellIndex) => {
      if (!CUSTOMER_LABEL.test(cell.text)) return;
      blocked.add(cellKey(lineIndex, cellIndex));

      for (
        let belowIndex = lineIndex + 1;
        belowIndex <= lineIndex + CLIENT_BLOCK_LOOKAHEAD_LINES && belowIndex < lines.length;
        belowIndex++
      ) {
        const belowLine = lines[belowIndex];
        if (belowLine.page !== line.page) break;
        belowLine.cells.forEach((belowCell, belowCellIndex) => {
          if (cellsOverlapHorizontally(cell, belowCell, line.height)) {
            blocked.add(cellKey(belowIndex, belowCellIndex));
          }
        });
      }
    });
  });

  return blocked;
}

function extractIssuerTaxId(
  lines: PdfTextLine[],
  useDistanceFallback: boolean,
  excludedTaxIds: string[],
): { value: string; lineIndex: number; cellIndex: number } | undefined {
  const allTaxIds = findAllTaxIdCells(lines);
  if (allTaxIds.length === 0) return undefined;

  const blockedCells = computeClientBlockCells(lines, useDistanceFallback);
  const excluded = new Set(excludedTaxIds.map((taxId) => canonicalSpanishTaxId(taxId)));

  const candidates = allTaxIds.filter(
    (candidate) => !blockedCells.has(cellKey(candidate.lineIndex, candidate.cellIndex)) && !excluded.has(candidate.value),
  );
  if (candidates.length === 0) return undefined;

  const chosen = candidates.find((candidate) => candidate.checksumValid) ?? candidates[0];
  return { value: chosen.value, lineIndex: chosen.lineIndex, cellIndex: chosen.cellIndex };
}

function extractInvoiceNumber(lines: PdfTextLine[]): string | undefined {
  const matches = findLabelledValues(lines, INVOICE_NUMBER_LABEL, parseInvoiceNumberValue);
  return matches[0]?.value;
}

function extractDate(lines: PdfTextLine[]): string | undefined {
  const labelled = findLabelledValues(lines, FECHA_LABEL, parseDateCellValue);
  if (labelled.length > 0) return labelled[0].value;

  for (const line of lines) {
    for (const cell of line.cells) {
      const value = parseDateCellValue(cell.text);
      if (value) return value;
    }
  }
  return undefined;
}

function extractDueDate(lines: PdfTextLine[]): string | undefined {
  const matches = findLabelledValues(lines, VENCIMIENTO_LABEL, parseDateCellValue);
  return matches[0]?.value;
}

interface TotalCandidate {
  value: number;
  priority: number;
  page: number;
  lineIndex: number;
}

function findLabelledValuesOnSameRow<T>(
  lines: PdfTextLine[],
  label: RegExp,
  parse: (cellText: string) => T | undefined,
): { value: T; lineIndex: number; cellIndex: number }[] {
  const results: { value: T; lineIndex: number; cellIndex: number }[] = [];

  lines.forEach((line, lineIndex) => {
    line.cells.forEach((cell, cellIndex) => {
      const match = label.exec(cell.text);
      if (!match) return;

      const remainder = cell.text.slice(match.index + match[0].length);
      const inlineValue = parse(remainder);
      if (inlineValue !== undefined) {
        results.push({ value: inlineValue, lineIndex, cellIndex });
        return;
      }

      for (let index = cellIndex + 1; index < line.cells.length; index++) {
        const value = parse(line.cells[index].text);
        if (value !== undefined) {
          results.push({ value, lineIndex, cellIndex });
          break;
        }
      }
    });
  });

  return results;
}

function collectTotalCandidates(lines: PdfTextLine[], useDistanceFallback: boolean): TotalCandidate[] {
  const candidates: TotalCandidate[] = [];
  const priorities: [RegExp, number][] = [
    [TOTAL_LABEL_P3, 3],
    [TOTAL_LABEL_P2, 2],
    [TOTAL_LABEL_P1, 1],
  ];
  const search = useDistanceFallback ? findLabelledValuesOnSameRow : findLabelledValues;

  for (const [pattern, priority] of priorities) {
    for (const match of search(lines, pattern, (cellText) => lastMoneyAmount(cellText))) {
      candidates.push({ value: match.value, priority, page: lines[match.lineIndex].page, lineIndex: match.lineIndex });
    }
  }

  return candidates;
}

function extractTotal(lines: PdfTextLine[], useDistanceFallback: boolean): number | undefined {
  const candidates = collectTotalCandidates(lines, useDistanceFallback);
  if (candidates.length === 0) return undefined;

  const bestPriority = Math.max(...candidates.map((candidate) => candidate.priority));
  const atBestPriority = candidates.filter((candidate) => candidate.priority === bestPriority);

  return atBestPriority.reduce((latest, candidate) =>
    candidate.page > latest.page || (candidate.page === latest.page && candidate.lineIndex > latest.lineIndex)
      ? candidate
      : latest,
  ).value;
}

function extractLabelledTaxBase(lines: PdfTextLine[]): number | undefined {
  const matches = findLabelledValues(lines, BASE_IMPONIBLE_LABEL, (cellText) => lastMoneyAmount(cellText));
  return matches[0]?.value;
}

function collectMoneyAmounts(lines: PdfTextLine[]): number[] {
  const flatText = lines.flatMap((line) => line.cells.map((cell) => cell.text)).join('\n');
  return findMoneyAmounts(flatText).filter((value) => value > 0);
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

function extractLabelledTax(lines: PdfTextLine[]): { taxRate?: number; taxAmount?: number } {
  const rateMatches = findLabelledValues(lines, IVA_LABEL, parseRateValue);
  const amountMatches = findLabelledValues(lines, IVA_LABEL, (cellText) => lastMoneyAmount(cellText, true));
  return { taxRate: rateMatches[0]?.value, taxAmount: amountMatches[0]?.value };
}

function extractLabelledIrpf(lines: PdfTextLine[]): { irpfRate?: number; irpfAmount?: number } {
  const rateMatches = findLabelledValues(lines, IRPF_LABEL, parseRateValue);
  const amountMatches = findLabelledValues(lines, IRPF_LABEL, (cellText) => lastMoneyAmount(cellText, true));
  const irpfAmount = amountMatches[0] ? Math.abs(amountMatches[0].value) : undefined;
  return { irpfRate: rateMatches[0]?.value, irpfAmount };
}

function isMostlyDigits(text: string): boolean {
  const digitCount = (text.match(/\d/g) ?? []).length;
  return text.length > 0 && digitCount / text.length > 0.5;
}

function isPlausibleIssuerCellText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  if (NON_ISSUER_LINE.test(trimmed)) return false;
  if (DATE_VALUE.test(trimmed)) return false;
  if (findSpanishTaxIds(trimmed).length > 0) return false;
  if (findMoneyAmounts(trimmed).length > 0) return false;
  if (POSTCODE_LINE.test(trimmed)) return false;
  if (ADDRESS_CONTACT_TOKENS.test(trimmed)) return false;
  if (isMostlyDigits(trimmed)) return false;
  if (STARTS_LOWERCASE.test(trimmed)) return false;
  return true;
}

function extractIssuerName(
  lines: PdfTextLine[],
  issuerTaxIdRef: { lineIndex: number; cellIndex: number } | undefined,
  blockedCells: Set<string>,
): string | undefined {
  const isPlausible = (lineIndex: number, cellIndex: number): boolean =>
    !blockedCells.has(cellKey(lineIndex, cellIndex)) && isPlausibleIssuerCellText(lines[lineIndex].cells[cellIndex].text);

  if (issuerTaxIdRef) {
    const nearby: { lineIndex: number; cellIndex: number }[] = [];
    for (let distance = 0; distance <= ISSUER_NAME_SEARCH_WINDOW; distance++) {
      const before = issuerTaxIdRef.lineIndex - distance;
      if (before >= 0) {
        lines[before].cells.forEach((_, cellIndex) => {
          if (isPlausible(before, cellIndex)) nearby.push({ lineIndex: before, cellIndex });
        });
      }
      if (distance > 0) {
        const after = issuerTaxIdRef.lineIndex + distance;
        if (after < lines.length) {
          lines[after].cells.forEach((_, cellIndex) => {
            if (isPlausible(after, cellIndex)) nearby.push({ lineIndex: after, cellIndex });
          });
        }
      }

      const withLegalForm = nearby.find((ref) => LEGAL_FORM_SUFFIX.test(lines[ref.lineIndex].cells[ref.cellIndex].text));
      if (withLegalForm) return lines[withLegalForm.lineIndex].cells[withLegalForm.cellIndex].text.trim();
    }
    if (nearby.length > 0) return lines[nearby[0].lineIndex].cells[nearby[0].cellIndex].text.trim();
  }

  const page1Lines = lines.filter((line) => line.page === 1);
  const topThirdBoundary = Math.max(1, Math.ceil(page1Lines.length / 3));
  for (let lineIndex = 0; lineIndex < lines.length && lineIndex < topThirdBoundary; lineIndex++) {
    if (lines[lineIndex].page !== 1) continue;
    for (let cellIndex = 0; cellIndex < lines[lineIndex].cells.length; cellIndex++) {
      if (isPlausible(lineIndex, cellIndex)) return lines[lineIndex].cells[cellIndex].text.trim();
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    for (let cellIndex = 0; cellIndex < lines[lineIndex].cells.length; cellIndex++) {
      if (isPlausible(lineIndex, cellIndex)) return lines[lineIndex].cells[cellIndex].text.trim();
    }
  }
  return undefined;
}

export function extractInvoiceHeuristics(
  input: string | PdfTextLine[],
  context: HeuristicContext = {},
): HeuristicExtraction {
  const useDistanceFallback = typeof input === 'string';
  const lines = useDistanceFallback ? linesFromText(input) : input;

  const warnings: ExtractionWarningCode[] = [];
  const excludedTaxIds = context.excludedTaxIds ?? [];

  const issuer = extractIssuerTaxId(lines, useDistanceFallback, excludedTaxIds);
  const issuerTaxId = issuer?.value;
  if (!issuerTaxId) warnings.push('missing_issuer_tax_id');

  const invoiceNumber = extractInvoiceNumber(lines);
  if (!invoiceNumber) warnings.push('missing_invoice_number');

  const date = extractDate(lines);
  if (!date) warnings.push('missing_invoice_date');

  const dueDate = extractDueDate(lines);

  const amount = extractTotal(lines, useDistanceFallback);
  if (amount == null) warnings.push('missing_total_amount');

  let taxBase = extractLabelledTaxBase(lines);
  const labelledTax = extractLabelledTax(lines);
  const taxRate = labelledTax.taxRate;
  let taxAmount = labelledTax.taxAmount;

  if (taxRate != null && (taxBase == null || taxAmount == null)) {
    const pair = findTaxRatioPair(collectMoneyAmounts(lines), taxRate, amount);
    if (pair) {
      taxBase = pair.taxBase;
      taxAmount = pair.taxAmount;
    }
  }

  const labelledIrpf = extractLabelledIrpf(lines);
  const irpfRate = labelledIrpf.irpfRate;
  const irpfAmount = labelledIrpf.irpfAmount;

  const currency = detectCurrency(lines) ?? (amount != null ? 'EUR' : undefined);

  const hasOtherEvidence = issuerTaxId != null || invoiceNumber != null || date != null || amount != null;
  const blockedCells = computeClientBlockCells(lines, useDistanceFallback);
  const issuerName = hasOtherEvidence ? extractIssuerName(lines, issuer, blockedCells) : undefined;
  if (!issuerName) warnings.push('missing_issuer_name');

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
