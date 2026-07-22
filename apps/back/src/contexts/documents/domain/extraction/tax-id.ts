export function normaliseTaxId(value: string): string {
  return value.toUpperCase().replace(/-/g, '');
}
