function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const t = value.trim()
  if (
    t.length >= 2 &&
    ((t[0] === '{' && t[t.length - 1] === '}') ||
      (t[0] === '[' && t[t.length - 1] === ']'))
  ) {
    try {
      return JSON.parse(t)
    } catch {
      // not valid JSON — return as-is
    }
  }
  return value
}

function parseFormDataKey(key: string): Array<string | null> {
  const parts: Array<string | null> = []
  const segmentRegex = /^([^\[]+)|\[([^\]]*)]/g
  let match: RegExpExecArray | null

  while ((match = segmentRegex.exec(key)) !== null) {
    const segment = match[1] ?? match[2]
    parts.push(segment === '' ? null : segment)
  }

  return parts
}

function setNestedValue(
  container: Record<string, unknown>,
  path: Array<string | null>,
  value: unknown,
): void {
  if (path.length === 0) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = container

  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!
    const nextSegment = path[i + 1]
    const nextIsArray =
      nextSegment === null ||
      /^\d+$/.test(nextSegment)

    if (current[segment] == null) {
      current[segment] = nextIsArray ? [] : {}
    }

    current = current[segment]
  }

  const lastSegment = path[path.length - 1]

  if (lastSegment === null) {
    if (Array.isArray(current)) {
      if (Array.isArray(value)) {
        current.push(...value)
      } else {
        current.push(value)
      }
    }
  } else if (/^\d+$/.test(lastSegment)) {
    current[parseInt(lastSegment, 10)] = value
  } else {
    current[lastSegment] = value
  }
}

/**
 * Parses a flat multipart/form-data body with bracket-notation keys into a
 * nested object structure.
 *
 * Multer (and most HTTP clients) serialise nested fields using bracket notation
 * but leave them as flat string keys in `req.body`. This function restores the
 * intended nesting.
 *
 * String values that look like a JSON object or array are parsed automatically.
 *
 * @example
 * parseFormData({
 *   'name': 'Alice',
 *   'address[city]': 'Paris',
 *   'persons[0][name]': 'Bob',
 *   'persons[0][age]': '30',
 *   'tags[]': 'a',
 * })
 * // => {
 * //   name: 'Alice',
 * //   address: { city: 'Paris' },
 * //   persons: [{ name: 'Bob', age: '30' }],
 * //   tags: ['a'],
 * // }
 */
export function parseFormData(
  flatBody: Record<string, string | string[]>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, rawValue] of Object.entries(flatBody)) {
    const value: unknown = Array.isArray(rawValue)
      ? rawValue.map(tryParseJson)
      : tryParseJson(rawValue)

    if (key.includes('[')) {
      const path = parseFormDataKey(key)
      setNestedValue(result, path, value)
    } else {
      result[key] = value
    }
  }

  return result
}
