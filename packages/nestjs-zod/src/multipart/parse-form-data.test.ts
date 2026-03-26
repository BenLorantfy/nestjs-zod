import { parseFormData } from './parse-form-data'

describe('parseFormData', () => {
  // ---------------------------------------------------------------------------
  // 1. Flat keys (no bracket notation)
  // ---------------------------------------------------------------------------
  describe('flat keys', () => {
    it('returns string values unchanged', () => {
      expect(parseFormData({ name: 'Alice', age: '30' })).toEqual({
        name: 'Alice',
        age: '30',
      })
    })

    it('returns string-array values (multer multi-value fields) unchanged', () => {
      // multer collects duplicate field names as a string[]
      expect(parseFormData({ tags: ['a', 'b'] })).toEqual({ tags: ['a', 'b'] })
    })

    it('returns an empty object for empty input', () => {
      expect(parseFormData({})).toEqual({})
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Bracket-notation expansion
  // ---------------------------------------------------------------------------
  describe('bracket-notation expansion', () => {
    it('expands a single nested object key', () => {
      expect(parseFormData({ 'address[city]': 'Paris' })).toEqual({
        address: { city: 'Paris' },
      })
    })

    it('expands numeric indices into an array', () => {
      expect(parseFormData({ 'tags[0]': 'a', 'tags[1]': 'b' })).toEqual({
        tags: ['a', 'b'],
      })
    })

    it('expands objects nested inside arrays', () => {
      expect(
        parseFormData({
          'persons[0][name]': 'Alice',
          'persons[0][age]': '30',
          'persons[1][name]': 'Bob',
          'persons[1][age]': '25',
        }),
      ).toEqual({
        persons: [
          { name: 'Alice', age: '30' },
          { name: 'Bob', age: '25' },
        ],
      })
    })

    it('expands three levels deep', () => {
      expect(parseFormData({ 'a[b][c]': 'deep' })).toEqual({
        a: { b: { c: 'deep' } },
      })
    })

    it('handles push notation `field[]` with a single value', () => {
      expect(parseFormData({ 'tags[]': 'a' })).toEqual({ tags: ['a'] })
    })

    it('handles push notation `field[]` when multer already collected an array', () => {
      // multer gathers multiple `tags[]` values into a string[]
      expect(parseFormData({ 'tags[]': ['a', 'b'] })).toEqual({ tags: ['a', 'b'] })
    })

    it('handles sparse array indices', () => {
      const result = parseFormData({ 'items[2]': 'c' }) as { items: unknown[] }
      expect(result.items[2]).toBe('c')
      expect(result.items.length).toBe(3)
    })

    it('mixes flat keys and bracket-notation keys in the same body', () => {
      expect(
        parseFormData({
          title: 'My form',
          'meta[author]': 'Alice',
          'tags[0]': 'news',
        }),
      ).toEqual({
        title: 'My form',
        meta: { author: 'Alice' },
        tags: ['news'],
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 3. JSON auto-parsing
  // ---------------------------------------------------------------------------
  describe('JSON auto-parsing', () => {
    it('parses a flat field whose value is a JSON object string', () => {
      // Swagger UI or some HTTP clients send nested objects as a JSON string
      expect(
        parseFormData({ coordinates: '{"x":1,"y":2}' }),
      ).toEqual({ coordinates: { x: 1, y: 2 } })
    })

    it('parses a flat field whose value is a JSON array string', () => {
      expect(
        parseFormData({ crew: '[{"name":"Luke","role":"pilot"}]' }),
      ).toEqual({ crew: [{ name: 'Luke', role: 'pilot' }] })
    })

    it('does not parse strings that do not look like JSON', () => {
      // Ordinary strings must not be touched
      expect(parseFormData({ note: 'hello world' })).toEqual({ note: 'hello world' })
    })

    it('does not crash on a string starting with `{` that is not valid JSON', () => {
      expect(parseFormData({ bad: '{not json' })).toEqual({ bad: '{not json' })
    })

    it('does not crash on a string starting with `[` that is not valid JSON', () => {
      expect(parseFormData({ bad: '[not json' })).toEqual({ bad: '[not json' })
    })

    it('parses a bracket-notation value that is itself a JSON object', () => {
      // crew[0]={"name":"Luke"} (unusual but valid)
      expect(
        parseFormData({ 'crew[0]': '{"name":"Luke"}' }),
      ).toEqual({ crew: [{ name: 'Luke' }] })
    })

    it('parses each element when multer produces a string[] for the same key', () => {
      // crew[]={"name":"Luke"}&crew[]={"name":"Leia"}
      expect(
        parseFormData({ 'crew[]': ['{"name":"Luke"}', '{"name":"Leia"}'] }),
      ).toEqual({ crew: [{ name: 'Luke' }, { name: 'Leia' }] })
    })

    it('leaves already-parsed values (non-strings) untouched', () => {
      // Should never happen in practice but guard against it anyway
      expect(parseFormData({ count: '42' })).toEqual({ count: '42' })
    })
  })
})
