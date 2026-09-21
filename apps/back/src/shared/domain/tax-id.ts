export function normalizeTaxId(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  const normalized = value.trim().toUpperCase().replace(/[\s.-]/g, '');
  return normalized.length === 0 ? null : normalized;
}
