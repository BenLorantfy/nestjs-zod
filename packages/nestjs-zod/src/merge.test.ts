import { deepClone, deepMerge } from './merge';

describe('deepClone', () => {
  it('should deeply clone objects and arrays', () => {
    const original = {
      type: 'object',
      properties: { tags: { type: 'array', enum: ['a', 'b'] } },
    };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.properties).not.toBe(original.properties);
    expect(cloned.properties.tags.enum).not.toBe(original.properties.tags.enum);
  });

  it('should keep a property named constructor', () => {
    expect(deepClone({ constructor: { type: 'string' } })).toEqual({
      constructor: { type: 'string' },
    });
  });

  it('should not copy __proto__ keys', () => {
    const malicious = JSON.parse('{"a": {"__proto__": {"polluted": true}}}');
    const cloned = deepClone(malicious);

    expect(cloned.a.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(cloned.a)).toBe(Object.prototype);
  });
});

describe('deepMerge', () => {
  it('should deeply merge objects and dedupe arrays', () => {
    expect(
      deepMerge<Record<string, unknown>>(
        {
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
        },
        {
          type: 'object',
          properties: { b: { type: 'number' } },
          required: ['a', 'b'],
        },
      ),
    ).toEqual({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      required: ['a', 'b'],
    });
  });

  it('should not mutate its inputs', () => {
    const target = { properties: { a: { type: 'string' } } };
    const source = { properties: { b: { type: 'number' } } };
    deepMerge<Record<string, unknown>>(target, source);

    expect(target).toEqual({ properties: { a: { type: 'string' } } });
    expect(source).toEqual({ properties: { b: { type: 'number' } } });
  });

  it('should not copy __proto__ keys from the source', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const merged = deepMerge<Record<string, unknown>>({}, malicious);

    expect(merged.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
