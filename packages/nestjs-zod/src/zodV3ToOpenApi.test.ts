import { z, ZodTypeAny } from 'zod/v3'
import { zodV3ToOpenAPI } from './zodV3ToOpenApi'

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
  record: z.record(z.string(), z.number()),
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

it('should serialize a complex schema', () => {
  const openApiObject = zodV3ToOpenAPI(complexTestSchema)

  expect(openApiObject).toMatchSnapshot()
})

it('should serialize an intersection of objects', () => {
  const openApiObject = zodV3ToOpenAPI(intersectedObjectsSchema)

  expect(openApiObject).toMatchSnapshot()
})

it('should serialize an intersection of unions', () => {
  const openApiObject = zodV3ToOpenAPI(intersectedUnionsSchema)

  expect(openApiObject).toMatchSnapshot()
})

it('should serialize an intersection with overrided fields', () => {
  const openApiObject = zodV3ToOpenAPI(overrideIntersectionSchema)

  expect(openApiObject).toMatchSnapshot()
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
      const openApiObject = zodV3ToOpenAPI(zodType)

      expect(openApiObject).toEqual({
        type: expectedType,
        format: expectedFormat ?? undefined,
      })
    })
  }
})

it('should handle optional types', () => {
  const openApiObject = zodV3ToOpenAPI(
    z.object({
      name: z.string().optional(),
    })
  )

  expect(openApiObject).toEqual({
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
    },
  })
})
