// Small replacements for the `deepmerge` package, which has an unpatched
// prototype pollution vulnerability (CVE-2026-93753)

function isMergeableObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

export function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as T;
  }

  if (isMergeableObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (key === '__proto__') continue;
      result[key] = deepClone(value[key]);
    }
    return result as T;
  }

  return value;
}

/**
 * Deeply merges `source` into a copy of `target`.  Arrays are concatenated
 * without duplicates.
 */
export function deepMerge<T>(target: T, source: T): T {
  if (Array.isArray(target) && Array.isArray(source)) {
    return Array.from(new Set([...target, ...source])) as T;
  }

  if (
    isMergeableObject(target) &&
    isMergeableObject(source) &&
    !Array.isArray(target) &&
    !Array.isArray(source)
  ) {
    const result: Record<string, unknown> = deepClone(target);
    for (const key of Object.keys(source)) {
      if (key === '__proto__') continue;
      result[key] = Object.prototype.hasOwnProperty.call(result, key)
        ? deepMerge(result[key], source[key])
        : deepClone(source[key]);
    }
    return result as T;
  }

  return deepClone(source);
}
