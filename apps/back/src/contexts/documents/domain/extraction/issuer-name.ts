export function normaliseIssuerName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
