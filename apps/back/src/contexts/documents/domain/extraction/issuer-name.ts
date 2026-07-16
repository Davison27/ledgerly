/**
 * Normalises an issuer's display name for use as a hint lookup key: trimmed,
 * internal whitespace runs collapsed to a single space, and upper-cased.
 * Used instead of the issuer's tax id because the heuristic extraction
 * routinely picks up the *client*'s CIF/NIF (the ERP tenant, identical
 * across every invoice) rather than the supplier's, which would collapse
 * every issuer's hints under a single key. The issuer's printed name does
 * not have this problem.
 */
export function normaliseIssuerName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}
