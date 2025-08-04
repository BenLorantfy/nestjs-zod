import { ZodTypeAny } from 'zod';
import { z as actualZod } from '@nest-zod/z'
import { z as nestjsZod } from '@nest-zod/z'
import { zodToOpenAPI } from './zod-to-openapi'

describe.each([
  ['zod', actualZod],
  ['@nest-zod/z', nestjsZod],
])('zodToOpenAPI (using %s)', (description, z) => {
  const complexTestSchema = z.object({
    stringMinMax: z.string().min(5).max(15),
    numberMinMax: z.number().min(3).max(10),
    numberMultipleOf: z.number().multipleOf(10),
    enumDefault: z.enum(['buy-it-now', 'auctions']).default('buy-it-now'),
    tuple: z.tuple([
      z.string(),
      z.object({ name: z.literal('Rudy') }),
      z.array(z.union([z.literal('blue'), z.literal('red')])),
    ]),
    union: z
      .union([z.literal('kek'), z.literal('topkek')])
      .describe('Please choose topkek'),
    discriminatedUnion: z.discriminatedUnion('name', [
      z.object({ name: z.literal('vasya'), age: z.number() }),
      z.object({ name: z.literal('petya'), age: z.number() }),
    ]),
    literalString: z.literal('123'),
    literalNumber: z.literal(123),
    literalBoolean: z.literal(true),
    array: z.array(z.string()).max(3),
    objectNested: z.object({
      uuid: z.string().uuid(),
    }),
    record: z.record(z.number()),
    recordWithKeys: z.record(z.number(), z.string()),
    zodDateString: z.string().datetime(),
  })
  
  const intersectedObjectsSchema = z.intersection(
    z.object({
      one: z.number(),
    }),
    z.object({
      two: z.number(),
    })
  )
  
  const intersectedUnionsSchema = z.intersection(
    z.union([z.literal('123'), z.number()]),
    z.union([z.boolean(), z.array(z.string())])
  )
  
  const overrideIntersectionSchema = z.intersection(
    z.object({
      one: z.number(),
    }),
    z.object({
      one: z.string(),
    })
  )
  
  const transformedSchema = z
    .object({
      seconds: z.number(),
    })
    .transform((value) => ({
      seconds: value.seconds,
      minutes: value.seconds / 60,
      hours: value.seconds / 3600,
    }))
  
  const lazySchema = z.lazy(() => z.string())
  
  it('should serialize a complex schema', () => {
    const openApiObject = zodToOpenAPI(complexTestSchema)
  
    expect(openApiObject).toMatchSnapshot()
  })
  
  it('should serialize an intersection of objects', () => {
    const openApiObject = zodToOpenAPI(intersectedObjectsSchema)
  
    expect(openApiObject).toMatchSnapshot()
  })
  
  it('should serialize an intersection of unions', () => {
    const openApiObject = zodToOpenAPI(intersectedUnionsSchema)
  
    expect(openApiObject).toMatchSnapshot()
  })
  
  it('should serialize an intersection with overrided fields', () => {
    const openApiObject = zodToOpenAPI(overrideIntersectionSchema)
  
    expect(openApiObject).toMatchSnapshot()
  })
  
  it('should serialize objects', () => {
    const schema = z.object({
      prop1: z.string(),
      prop2: z.string().optional(),
    })
    const openApiObject = zodToOpenAPI(schema)
  
    expect(openApiObject).toEqual({
      type: 'object',
      required: ['prop1'],
      properties: {
        prop1: {
          type: 'string',
        },
        prop2: {
          type: 'string',
        },
      },
    })
  })
  
  it('should serialize partial objects', () => {
    const schema = z
      .object({
        prop1: z.string(),
        prop2: z.string(),
      })
      .partial()
    const openApiObject = zodToOpenAPI(schema)
  
    expect(openApiObject).toEqual({
      type: 'object',
      properties: {
        prop1: {
          type: 'string',
        },
        prop2: {
          type: 'string',
        },
      },
    })
  })
  
  it('should serialize nullable types', () => {
    const schema = z.string().nullable()
    const openApiObject = zodToOpenAPI(schema)
  
    expect(openApiObject).toEqual({ type: 'string', nullable: true })
  })
  
  it('should serialize optional types', () => {
    const schema = z.string().optional()
    const openApiObject = zodToOpenAPI(schema)
  
    expect(openApiObject).toEqual({ type: 'string' })
  })
  
  it('should serialize types with default value', () => {
    const schema = z.string().default('abitia')
    const openApiObject = zodToOpenAPI(schema)
  
    expect(openApiObject).toEqual({ type: 'string', default: 'abitia' })
  })
  
  it('should serialize enums', () => {
    const schema = z.enum(['adama', 'kota'])
    const openApiObject = zodToOpenAPI(schema)
  
    expect(openApiObject).toEqual({
      type: 'string',
      enum: ['adama', 'kota'],
    })
  })
  
  it('should serialize native enums', () => {
    enum NativeEnum {
      ADAMA = 'adama',
      KOTA = 'kota',
    }
  
    const schema = z.nativeEnum(NativeEnum)
    const openApiObject = zodToOpenAPI(schema)
  
    expect(openApiObject).toEqual({
      'type': 'string',
      'enum': ['adama', 'kota'],
      'x-enumNames': ['ADAMA', 'KOTA'],
    })
  })
  
  describe('scalar types', () => {
    const testCases: [ZodTypeAny, string, string?][] = [
      // [zod type, expected open api type, expected format]
      [z.string(), 'string'],
      [z.number(), 'number'],
      [z.boolean(), 'boolean'],
      [z.bigint(), 'integer', 'int64'],
      // [z.null(), 'null'], <- Needs OpenApi 3.1 to be represented correctly
      // [z.undefined(), 'undefined'], <- TBD, probably the property should be removed from schema
    ]
  
    for (const [zodType, expectedType, expectedFormat] of testCases) {
      // eslint-disable-next-line no-loop-func
      it(expectedType, () => {
        const openApiObject = zodToOpenAPI(zodType)
  
        expect(openApiObject).toEqual({
          type: expectedType,
          format: expectedFormat ?? undefined,
        })
      })
    }
  })
  
  it('should serialize transformed schema', () => {
    const openApiObject = zodToOpenAPI(transformedSchema)
  
    expect(openApiObject).toEqual({
      type: 'object',
      required: ['seconds'],
      properties: {
        seconds: {
          type: 'number',
        },
      },
    })
  })
  
  it('should serialize lazy schema', () => {
    const openApiObject = zodToOpenAPI(lazySchema)
  
    expect(openApiObject).toEqual({
      type: 'string',
    })
  })
});


describe('special types', () => {
  const specialSchema = nestjsZod.object({
    dateString: nestjsZod.dateString().cast().describe('My date string'),
    zodDateString: nestjsZod.string().datetime(),
    password: nestjsZod.password(),
    passwordComplex: nestjsZod
      .password()
      .atLeastOne('digit')
      .atLeastOne('uppercase')
      .min(8)
      .max(100),
  });

  test('works for special types', () => {
    const openApiObject = zodToOpenAPI(specialSchema)

    expect(openApiObject).toEqual({
      properties: {
        dateString: {
          description: 'My date string',
          format: 'date-time',
          type: 'string'
        },
        password: {
          format: 'password',
          pattern: '^.*$',
          type: 'string'
        },
        passwordComplex: {
          format: 'password',
          maxLength: 100,
          minLength: 8,
          pattern: '^(?:(?=.*\\d)(?=.*[A-Z]).*)$',
          type: 'string'
        },
        zodDateString: {
          format: 'date-time',
          type: 'string'
        }
      },
      required: ['dateString', 'zodDateString', 'password', 'passwordComplex'],
      type: 'object'
    });
  })
});

describe('effects and required', () => {
  test('effects and non optional schema properties are required', () => {
    const z = nestjsZod
    const schema = z.object({
      name: z.string(),
      document: z.preprocess(
        (value) => value,
        z.object({
          kind: z.string(),
          number: z.number(),
        }),
      ),
    });
    const openApiObject = zodToOpenAPI(schema);
    expect(openApiObject).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        document: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
            },
            number: {
              type: 'number',
            },
          },
          required: ['kind', 'number'],
        },
      },
      required: ['name', 'document'],
    });
  });

  test('effects and optional schema properties are not required', () => {
    const z = nestjsZod;
    const schema = z.object({
      name: z.string(),
      document: z.preprocess(
        (value) => value,
        z
          .object({
            kind: z.string(),
            number: z.number(),
          })
          .optional(),
      ),
    });
    const openApiObject = zodToOpenAPI(schema);
    expect(openApiObject).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        document: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
            },
            number: {
              type: 'number',
            },
          },
          required: ['kind', 'number'],
        },
      },
      required: ['name'],
    });
  });

  test('effects and schema properties with default are not required', () => {
    const z = nestjsZod;
    const schema = z.object({
      name: z.string(),
      document: z.preprocess(
        (value) => value,
        z
          .object({
            kind: z.string(),
            number: z.number(),
          })
          .default({ kind: '', number: 1 }),
      ),
    });
    const openApiObject = zodToOpenAPI(schema);
    expect(openApiObject).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        document: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
            },
            number: {
              type: 'number',
            },
          },
          required: ['kind', 'number'],
          default: {
            kind: '',
            number: 1,
          },
        },
      },
      required: ['name'],
    });
  });

  test('effects and nullish schema properties with default are not required', () => {
    const z = nestjsZod;
    const schema = z.object({
      name: z.string(),
      document: z.preprocess(
        (value) => value,
        z
          .object({
            kind: z.string(),
            number: z.number(),
          })
          .nullish()
          .default(null),
      ),
    });
    const openApiObject = zodToOpenAPI(schema);
    expect(openApiObject).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        document: {
          type: 'object',
          properties: {
            kind: {
              type: 'string',
            },
            number: {
              type: 'number',
            },
          },
          required: ['kind', 'number'],
          nullable: true,
          default: null,
        },
      },
      required: ['name'],
    });
  });
});