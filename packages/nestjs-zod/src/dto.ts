/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodSchema, ZodTypeDef } from '@nest-zod/z'
import { zodToOpenAPI } from './openapi/zod-to-openapi'

export interface ZodDto<
  TOutput = any,
  TDef extends ZodTypeDef = ZodTypeDef,
  TInput = TOutput
> {
  new (): TOutput
  isZodDto: true
  schema: ZodSchema<TOutput, TDef, TInput>
  create(input: unknown): TOutput
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
      return this.schema.parse(input)
    }

    public static _OPENAPI_METADATA_FACTORY() {
      return zodToOpenAPI(this.schema).properties;
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TOutput, TDef, TInput>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isZodDto(metatype: any): metatype is ZodDto<unknown> {
  return metatype?.isZodDto
}
