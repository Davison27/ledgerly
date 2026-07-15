/**
 * Removes keys whose value is `undefined`, `null`, or an empty/whitespace-only string.
 *
 * The backend DTOs reject empty optional fields (e.g. `dueDate: ''` or `issuerName: ''`)
 * rather than treating them as "not provided". Forms often leave untouched optional
 * fields as `''`/`undefined`, so payloads must be sanitized before being sent.
 */
export function stripEmpty<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key of Object.keys(obj) as (keyof T)[]) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    result[key] = value;
  }

  return result;
}
