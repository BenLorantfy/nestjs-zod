/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodSchema, ZodTypeDef } from '@nest-zod/z'

export interface ZodDto<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
> {
  new (): TOutput
  new (values: unknown): TOutput
  isZodDto: true
  schema: ZodSchema<TOutput, TDef, TInput>
  create<T extends this>(this: T, input: unknown): InstanceType<typeof this>
}

export function createZodDto<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
>(schema: ZodSchema<TOutput, TDef, TInput>) {
  class AugmentedZodDto {
    public static isZodDto = true
    public static schema = schema

    public static create(input: unknown) {
      return Object.assign(
        Object.create(this.prototype),
        this.schema.parse(input)
      )
    }

    constructor(values?: unknown) {
      if (typeof values !== 'undefined') {
        // eslint-disable-next-line no-constructor-return
        return new.target.create(values)
      }
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TOutput, TDef, TInput>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isZodDto(metatype: any): metatype is ZodDto<unknown> {
  return metatype?.isZodDto
}
