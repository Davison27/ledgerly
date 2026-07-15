/**
 * Parses a number written using either the Spanish convention
 * ("1.234,56" -> thousands separated by dots, decimals by a comma) or the
 * plain XML/JSON convention ("1234.56"). Returns `null` when the input
 * cannot be interpreted as a number.
 */
export function parseSpanishNumber(raw: string | null | undefined): number | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let normalised = trimmed.replace(/[€$£\s]/g, '');

  const hasComma = normalised.includes(',');
  const hasDot = normalised.includes('.');

  if (hasComma && hasDot) {
    if (normalised.lastIndexOf(',') > normalised.lastIndexOf('.')) {
      // Dot is the thousands separator, comma is the decimal separator.
      normalised = normalised.replace(/\./g, '').replace(',', '.');
    } else {
      // Comma is the thousands separator, dot is the decimal separator.
      normalised = normalised.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalised = normalised.replace(',', '.');
  }

  const value = Number(normalised);

  return Number.isFinite(value) ? value : null;
}

// Matches Spanish-formatted monetary amounts ("1.234,56", "760,00") and
// plain dot-decimal amounts ("919.60"), each requiring exactly two decimal
// digits so that unrelated integers (ids, quantities, phone numbers, dates)
// are not mistaken for money. A trailing "%" disqualifies the match so tax
// rates such as "21,50%" are not picked up as amounts.
const MONEY_TOKEN = /-?\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)(?!\s*%)|-?\d+\.\d{2}(?!\d)(?!\s*%)/g;

/**
 * Scans free-form text for monetary amounts (Spanish "1.234,56" or plain
 * "919.60" notation) and returns them parsed as numbers, in the order they
 * appear. Used as a robust fallback when labelled totals/bases cannot be
 * matched on a single line (e.g. the label and the value are printed in
 * separate table columns).
 */
export function extractSpanishMoneyAmounts(text: string): number[] {
  const matches = text.match(MONEY_TOKEN) ?? [];
  const amounts: number[] = [];
  for (const token of matches) {
    const value = parseSpanishNumber(token);
    if (value != null) {
      amounts.push(value);
    }
  }
  return amounts;
}

/**
 * Parses a plain decimal number as found in structured e-invoice XML
 * (Facturae / Factur-X), which always uses a dot as the decimal separator.
 */
export function parseXmlDecimal(raw: string | null | undefined): number | null {
  if (raw == null) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
}
