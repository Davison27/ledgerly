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
      normalised = normalised.replace(/\./g, '').replace(',', '.');
    } else {
      normalised = normalised.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalised = normalised.replace(',', '.');
  }

  const value = Number(normalised);

  return Number.isFinite(value) ? value : null;
}

const MONEY_TOKEN = /-?\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)(?!\s*%)|-?\d+\.\d{2}(?!\d)(?!\s*%)/g;

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
