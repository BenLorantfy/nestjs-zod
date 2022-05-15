import { ZodTypeAny } from '../z'
import { z } from '../z/_namespace'
import { zodToOpenAPI } from './zod-to-openapi'

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
  literalString: z.literal('123'),
  literalNumber: z.literal(123),
  literalBoolean: z.literal(true),
  array: z.array(z.string()).max(3),
  objectNested: z.object({
    uuid: z.string().uuid(),
  }),
  record: z.record(z.number()),
  recordWithKeys: z.record(z.number(), z.string()),
  dateString: z.dateString().cast().describe('My date string'),
})

it('should serialize a complex schema', () => {
  const openApiObject = zodToOpenAPI(complexTestSchema)

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
