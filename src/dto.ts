import { ZodSchema, ZodTypeDef } from 'zod'

export interface ZodDto<
  TOutput,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
> {
  new (): TOutput
  schema: ZodSchema<TOutput, TDef, TInput>
  create(input: unknown): TOutput
}

export function createZodDto<
  TOutput,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(schema: ZodSchema<TOutput, TDef, TInput>) {
  class AugmentedZodDto {
    public static isZodDto = true
    public static schema = schema

    public static create(input: unknown) {
      return this.schema.parse(input)
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TOutput, TDef, TInput>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isZodDto(metatype: any): metatype is ZodDto<unknown> {
  return metatype?.isZodDto
}
