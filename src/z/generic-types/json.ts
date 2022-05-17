import { z, ZodSchema } from 'zod'

type Literal = boolean | number | string
export type Json = Literal | { [key: string]: Json } | Json[]

const literal = z.union([z.string(), z.number(), z.boolean()])

export const json: ZodSchema<Json> = z.lazy(() =>
  z.union([literal, z.array(json), z.record(json)])
)
