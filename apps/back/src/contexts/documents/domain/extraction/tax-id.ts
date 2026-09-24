import { normalizeTaxId } from '../../../../shared/domain/tax-id';

export function normaliseTaxId(value: string): string {
  return value.toUpperCase().replace(/-/g, '');
}

const NIF_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIF_PATTERN = /^\d{8}[A-Z]$/;
const NIE_PATTERN = /^([XYZ])(\d{7})([A-Z])$/;
const KLM_PATTERN = /^[KLM](\d{7})([A-Z])$/;
const CIF_PATTERN = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/;
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';
const NIE_LEADING_DIGIT: Record<string, string> = { X: '0', Y: '1', Z: '2' };

const TAX_ID_TOKEN =
  /\b(ES-?)?([A-Z]-?\d{7}[0-9A-J]|\d{8}-?[A-Z]|[XYZKLM]-?\d{7}-?[A-Z])\b/gi;

export function canonicalSpanishTaxId(value: string): string {
  const normalized = normalizeTaxId(value) ?? '';
  return normalized.length === 11 && normalized.startsWith('ES') ? normalized.slice(2) : normalized;
}

function nifControlLetter(digits: string): string {
  return NIF_CONTROL_LETTERS[Number(digits) % 23];
}

function isValidNif(value: string): boolean {
  const match = NIF_PATTERN.exec(value);
  if (!match) return false;
  const digits = value.slice(0, 8);
  return value[8] === nifControlLetter(digits);
}

function isValidNie(value: string): boolean {
  const match = NIE_PATTERN.exec(value);
  if (!match) return false;
  const [, leading, digits, letter] = match;
  const nifDigits = `${NIE_LEADING_DIGIT[leading]}${digits}`;
  return letter === nifControlLetter(nifDigits);
}

function isValidKlm(value: string): boolean {
  const match = KLM_PATTERN.exec(value);
  if (!match) return false;
  const [, digits, letter] = match;
  return letter === nifControlLetter(digits);
}

function isValidCif(value: string): boolean {
  const match = CIF_PATTERN.exec(value);
  if (!match) return false;
  const [, , digits] = match;

  let evenSum = 0;
  let oddSum = 0;
  for (let index = 0; index < digits.length; index++) {
    const digit = Number(digits[index]);
    if (index % 2 === 0) {
      const doubled = digit * 2;
      oddSum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      evenSum += digit;
    }
  }

  const control = (10 - (evenSum + oddSum) % 10) % 10;
  const lastChar = value[value.length - 1];
  return lastChar === String(control) || lastChar === CIF_CONTROL_LETTERS[control];
}

export function isValidSpanishTaxId(value: string): boolean {
  const canonical = canonicalSpanishTaxId(value);
  return isValidNif(canonical) || isValidNie(canonical) || isValidKlm(canonical) || isValidCif(canonical);
}

export interface SpanishTaxIdMatch {
  raw: string;
  value: string;
  index: number;
  checksumValid: boolean;
}

export function findSpanishTaxIds(text: string): SpanishTaxIdMatch[] {
  const matches: SpanishTaxIdMatch[] = [];
  const pattern = new RegExp(TAX_ID_TOKEN.source, TAX_ID_TOKEN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const value = canonicalSpanishTaxId(raw);
    matches.push({ raw, value, index: match.index, checksumValid: isValidSpanishTaxId(value) });
  }

  return matches;
}
