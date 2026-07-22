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
