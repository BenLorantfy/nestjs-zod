import { clearOpenApiMetadataCache, createZodDto } from './dto';
import * as z4 from 'zod/v4';
import * as z3 from 'zod/v3';
import * as zodMini from 'zod/v4-mini';
import * as zodV4Core from 'zod/v4/core';
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

  it('should generate the OpenAPI metadata once per DTO', () => {
    const UserSchema = z.object({
      username: z.string(),
    });

    class UserDto extends createZodDto(UserSchema) {}

    const toJSONSchema = jest.spyOn(zodV4Core, 'toJSONSchema');
    let first: unknown;
    try {
      first = UserDto._OPENAPI_METADATA_FACTORY();
      const second = UserDto._OPENAPI_METADATA_FACTORY();

      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(toJSONSchema).toHaveBeenCalledTimes(z === z4 ? 1 : 0);
    } finally {
      toJSONSchema.mockRestore();
    }

    (first as Record<string, unknown>).username = 'edited by a caller';
    expect(UserDto._OPENAPI_METADATA_FACTORY()).not.toEqual(first);
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

  it('regenerates the OpenAPI metadata after the cache is cleared', () => {
    const InnerSchema = z4.object({ name: z4.string() });
    const OuterSchema = z4.object({ inner: InnerSchema });

    class OuterDto extends createZodDto(OuterSchema) {}

    expect(OuterDto._OPENAPI_METADATA_FACTORY()).toEqual({
      inner: expect.not.objectContaining({ $ref: expect.anything() }),
    });

    InnerSchema.register(z4.globalRegistry, {
      id: 'RegeneratesAfterClearInner',
    });
    try {
      clearOpenApiMetadataCache();
      expect(OuterDto._OPENAPI_METADATA_FACTORY()).toEqual({
        inner: expect.objectContaining({
          $ref: '#/$defs/RegeneratesAfterClearInner',
        }),
      });
    } finally {
      z4.globalRegistry.remove(InnerSchema);
    }
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

  it('evaluates defaults on every call to the OpenAPI metadata factory', () => {
    let calls = 0;
    const UserSchema = z3.object({
      createdAt: z3.number().default(() => ++calls),
    });

    class UserDto extends createZodDto(UserSchema) {}

    expect(UserDto._OPENAPI_METADATA_FACTORY()).toEqual({
      createdAt: expect.objectContaining({ default: 1 }),
    });
    expect(UserDto._OPENAPI_METADATA_FACTORY()).toEqual({
      createdAt: expect.objectContaining({ default: 2 }),
    });
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
