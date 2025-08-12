import { ZodSchema, ZodTypeDef } from 'zod/v3'

export function from<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(schema: ZodSchema<TOutput, TDef, TInput>): ZodSchema<TOutput, TDef, TInput> {
  return schema
}
