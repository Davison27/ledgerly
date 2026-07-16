/**
 * Normalises a Spanish CIF/NIF/NIE tax id for use as a lookup key: upper-cased
 * and stripped of the hyphen some invoices print between the leading letter
 * (or before the trailing check letter) and the digits. Mirrors the
 * normalisation `findAllTaxIds` applies in `invoice-heuristics.ts`, so an
 * issuer's tax id always maps to the same key whether the source layout
 * writes it "B-12345678" or "B12345678".
 */
export function normaliseTaxId(value: string): string {
  return value.toUpperCase().replace(/-/g, '');
}
