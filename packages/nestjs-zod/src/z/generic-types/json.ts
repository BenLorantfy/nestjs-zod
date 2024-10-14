import { z, ZodSchema } from 'zod'

type Literal = boolean | number | string
export type Json = Literal | { [key: string]: Json } | Json[]

const literal = z.union([z.string(), z.number(), z.boolean()])

const DEFAULT_MESSAGE = 'Expected value to be a JSON-serializable'

export const json = (message: string = DEFAULT_MESSAGE) => {
  const schema: ZodSchema<Json> = z.lazy(() =>
    z.union([literal, z.array(schema), z.record(schema)], {
      invalid_type_error: message,
    })
  )

  return schema
}
