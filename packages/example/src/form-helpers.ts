import { z } from 'zod';

export function zFormJson<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val: unknown) => {
    if (typeof val !== 'string') return val;
    const t = val.trim();
    if (
      t.length >= 2 &&
      ((t[0] === '{' && t[t.length - 1] === '}') ||
        (t[0] === '[' && t[t.length - 1] === ']'))
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(t);
      } catch {
        // not valid JSON
      }
    }
    return val;
  }, schema);
}

function tryParseJsonItem(item: unknown): unknown {
  if (typeof item !== 'string') return item;
  const t = item.trim();
  if (
    t.length >= 2 &&
    ((t[0] === '{' && t[t.length - 1] === '}') ||
      (t[0] === '[' && t[t.length - 1] === ']'))
  ) {
    try {
      return JSON.parse(t);
    } catch {
      // not valid JSON
    }
  }
  return item;
}

export function zFormArray<T extends z.ZodArray<any>>(arraySchema: T) {
  return z.preprocess((val: unknown) => {
    let arr: unknown[];

    if (Array.isArray(val)) {
      arr = val;
    } else if (val === undefined || val === null || val === '') {
      return [];
    } else if (typeof val === 'string') {
      const t = val.trim();
      if (t.startsWith('[') && t.endsWith(']')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed = JSON.parse(t);
          arr = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [val];
        }
      } else {
        return [val];
      }
    } else {
      return [val];
    }

    return arr.map(tryParseJsonItem);
  }, arraySchema);
}
