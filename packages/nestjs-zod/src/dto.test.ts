import { createZodDto, normalizeArrayType } from './dto';
import * as z4 from 'zod/v4';
import * as z3 from 'zod/v3';
import * as zodMini from 'zod/v4-mini';
import { z as nestZod } from '@nest-zod/z';

describe.each([
  { name: 'zod/v4', z: z4 },
  { name: 'zod/v3', z: z3 as unknown as typeof z4 },
])('$name', ({ z }) => {
  it('should correctly create DTO', () => {
    const UserSchema = z.object({
      username: z.string(),
      password: z.string(),
    });

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto.isZodDto).toBe(true);
    expect(UserDto.schema).toBe(UserSchema);

    const user = UserDto.create({
      username: 'vasya',
      password: 'strong',
    });

    expect(user).toEqual({
      username: 'vasya',
      password: 'strong',
    });
  });

  it('should generate correct OpenAPI metadata', () => {
    const UserSchema = z.object({
      username: z.string(),
      password: z.string(),
    });

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto._OPENAPI_METADATA_FACTORY()).toEqual({
      username: { type: 'string', required: true },
      password: { type: 'string', required: true },
    });
  });
});

describe('zod/v4', () => {
  it('allows creating an Output DTO from a schema', () => {
    const UserSchema = z4.object({
      username: z4.string(),
      password: z4.string(),
      myField: z4.string().optional().default('myField'),
    });

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto.Output._OPENAPI_METADATA_FACTORY()).toEqual({
      username: expect.objectContaining({ type: 'string', required: true }),
      password: expect.objectContaining({ type: 'string', required: true }),
      myField: expect.objectContaining({
        type: 'string',
        required: true,
        default: 'myField',
      }),
    });
  });
});

describe('zod/v3', () => {
  it('throws error if trying to create an Output DTO from a zod v3 schema', () => {
    const UserSchema = z3.object({
      username: z3.string(),
      password: z3.string(),
      myField: z3.string().optional().default('myField'),
    });

    class UserDto extends createZodDto(UserSchema) {}

    expect(() => UserDto.Output).toThrow(
      '[nestjs-zod] Output DTOs can only be created from zod v4 schemas',
    );
  });
});

describe.each([
  {
    name: 'zod/mini-v4',
    schema: zodMini.object({
      username: zodMini.string(),
      password: zodMini.string(),
    }),
  },
  {
    name: '@nest-zod/z',
    schema: nestZod.object({
      username: nestZod.string(),
      password: nestZod.string(),
    }),
  },
  {
    name: 'just a plain object with a parse method',
    schema: {
      parse: (input: unknown): { username: string; password: string } => {
        if (
          typeof input === 'object' &&
          input !== null &&
          'username' in input &&
          'password' in input &&
          typeof input.username === 'string' &&
          typeof input.password === 'string'
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return input as any;
        }

        throw new Error('Invalid input');
      },
    },
  },
])(
  '$name',
  ({
    schema,
  }: {
    schema: {
      parse: (input: unknown) => { username: string; password: string };
    };
  }) => {
    it('parses correctly', () => {
      class UserDto extends createZodDto(schema) {}

      expect(UserDto.isZodDto).toBe(true);
      expect(UserDto.schema).toBe(schema);

      const user = UserDto.create({
        username: 'vasya',
        password: 'strong',
      });

      expect(user).toEqual({
        username: 'vasya',
        password: 'strong',
      });
    });
  },
);

describe('normalizeArrayType', () => {
  it('leaves a schema with a non-array `type` untouched', () => {
    const schema = { type: 'string' };
    expect(normalizeArrayType(schema)).toEqual({ type: 'string' });
  });

  it('rewrites a 2-member `type` array into `anyOf`', () => {
    expect(normalizeArrayType({ type: ['string', 'null'] })).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
  });

  it('rewrites a `type` array with no `null` member into `anyOf`', () => {
    expect(normalizeArrayType({ type: ['string', 'number'] })).toEqual({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
  });

  it('rewrites a `type` array with more than 2 members into `anyOf`, preserving order', () => {
    expect(
      normalizeArrayType({ type: ['string', 'number', 'boolean', 'null'] }),
    ).toEqual({
      anyOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
        { type: 'null' },
      ],
    });
  });

  it('keeps sibling keywords (e.g. `description`) alongside the derived `anyOf`', () => {
    expect(
      normalizeArrayType({ type: ['string', 'null'], description: 'hi' }),
    ).toEqual({
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'hi',
    });
  });

  // This shape is not currently produced by zod's `toJSONSchema` (a node
  // either has a `type` array or its own `anyOf`, never both), but the
  // function is written to stay correct if that ever changes, or when a
  // hand-written/registered JSON Schema is merged in another way.
  it('keeps an existing `anyOf` as a separate `allOf` branch instead of merging it with the derived `anyOf`', () => {
    expect(
      normalizeArrayType({
        type: ['string', 'null'],
        anyOf: [{ $ref: '#/$defs/Foo' }],
      }),
    ).toEqual({
      anyOf: [{ $ref: '#/$defs/Foo' }],
      allOf: [{ anyOf: [{ type: 'string' }, { type: 'null' }] }],
    });
  });

  it('appends to an existing `allOf` when there is no `anyOf` to keep separate', () => {
    expect(
      normalizeArrayType({
        type: ['string', 'null'],
        allOf: [{ minLength: 1 }],
      }),
    ).toEqual({
      allOf: [{ minLength: 1 }],
      anyOf: [{ type: 'string' }, { type: 'null' }],
    });
  });
});
