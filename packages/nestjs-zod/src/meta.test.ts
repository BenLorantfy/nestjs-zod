import type { GlobalMeta } from 'zod/v4/core';
import z from 'zod/v4';
import { createZodDto } from './index';

// `GlobalMeta` has a `[k: string]: unknown` index signature, so any key is
// assignable to it.  This strips the index signature so we can check which
// keys are explicitly declared (and therefore show up in autocomplete)
type DeclaredKeys<T> = keyof {
  [
    K in keyof T as string extends K ? never : number extends K ? never : K
  ]: T[K];
};

describe('GlobalMeta', () => {
  // Checked at compile time by `pnpm typecheck`
  it('declares `example` so it shows up in autocomplete', () => {
    const declared: DeclaredKeys<GlobalMeta> = 'example';
    expect(declared).toBe('example');
  });

  it('accepts any value for `example`', () => {
    class UserDto extends createZodDto(
      z
        .object({
          name: z.string().meta({ example: 'John Doe' }),
          age: z.number().meta({ example: 42 }),
        })
        .meta({ example: { name: 'John Doe', age: 42 } }),
    ) {}

    expect(UserDto.schema.meta()?.example).toEqual({
      name: 'John Doe',
      age: 42,
    });
  });
});
