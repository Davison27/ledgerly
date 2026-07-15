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
