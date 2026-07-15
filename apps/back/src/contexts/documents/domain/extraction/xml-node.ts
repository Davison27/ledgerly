/**
 * Small helpers to navigate the loosely-typed object tree produced by
 * fast-xml-parser without leaning on `any` everywhere. XML elements that can
 * repeat are parsed as arrays by fast-xml-parser, so every navigation step
 * has to be able to transparently unwrap the first item of an array.
 */

export type XmlNode = string | number | Record<string, unknown> | XmlNode[] | undefined | null;

function unwrap(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function stringify(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

/** Navigates a path of element names, unwrapping arrays along the way. */
export function xmlGet(node: unknown, ...path: string[]): unknown {
  let current = unwrap(node);

  for (const key of path) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = unwrap((current as Record<string, unknown>)[key]);
  }

  return current;
}

/** Reads the text value of a leaf node, unwrapping `#text` when present. */
export function xmlText(node: unknown, ...path: string[]): string | undefined {
  const value = xmlGet(node, ...path);

  if (value == null) {
    return undefined;
  }

  const direct = stringify(value);
  if (direct != null) {
    return direct;
  }

  if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return stringify((value as Record<string, unknown>)['#text']);
  }

  return undefined;
}

/** Reads an attribute value (fast-xml-parser prefixes attributes with `@_`). */
export function xmlAttr(node: unknown, ...pathAndAttr: string[]): string | undefined {
  const attrName = pathAndAttr[pathAndAttr.length - 1];
  const path = pathAndAttr.slice(0, -1);
  const value = xmlGet(node, ...path);

  if (value == null || typeof value !== 'object') {
    return undefined;
  }

  return stringify((value as Record<string, unknown>)[`@_${attrName}`]);
}
