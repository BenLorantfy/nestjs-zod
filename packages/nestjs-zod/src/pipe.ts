import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common'
import { isZodDto, ZodDto } from './dto'
import { createZodValidationException, ZodExceptionCreator } from './exception'
import { UnknownSchema } from './types'
import { validate } from './validate'

interface ZodValidationPipeOptions {
  createValidationException?: ZodExceptionCreator
}

type ZodValidationPipeClass = {
  new (options: ZodValidationPipeConstructorOptions): PipeTransform
  new (schemaOrDto?: UnknownSchema | ZodDto<UnknownSchema>): PipeTransform
}

export interface ZodValidationPipeConstructorOptions {
  schema?: UnknownSchema | ZodDto<UnknownSchema>
  /**
   * If this flag is set to true, inputs that do not specify a schema (either
   * via the {@link ZodValidationPipeConstructorOptions.schema}, or by using a
   * ZodDto class), will be rejected. This prevents unvalidated inputs from
   * getting passed the {@link ZodValidationPipe}.
   *
   * @default false
   */
  rejectNoSchema?: boolean
}

export function createZodValidationPipe({
  createValidationException = createZodValidationException,
}: ZodValidationPipeOptions = {}): ZodValidationPipeClass {
  @Injectable()
  class ZodValidationPipe implements PipeTransform {
    private readonly schema: UnknownSchema | ZodDto<UnknownSchema> | undefined
    private readonly rejectNoSchema?: boolean

    constructor(options: ZodValidationPipeConstructorOptions)
    constructor(schemaOrDto?: UnknownSchema | ZodDto<UnknownSchema>)
    constructor(
      schemaOrOptions:
        | UnknownSchema
        | ZodDto<UnknownSchema>
        | ZodValidationPipeConstructorOptions = {}
    ) {
      if (isZodDto(schemaOrOptions) || 'parse' in schemaOrOptions) {
        this.schema = schemaOrOptions
      } else {
        this.schema = schemaOrOptions.schema
        this.rejectNoSchema = schemaOrOptions.rejectNoSchema
      }
    }

    public transform(value: unknown, metadata: ArgumentMetadata) {
      if (this.schema) {
        return validate(value, this.schema, createValidationException)
      }

      const { metatype, type: paramType, data } = metadata

      if (isZodDto(metatype)) {
        return validate(value, metatype.schema, createValidationException)
      }

      if (!this.rejectNoSchema) {
        return value
      }

      const runtimeType = PRIMITIVE_TYPES.get(metatype)
      if (runtimeType && typeof value === runtimeType) {
        // Allow simple `@Body() param: number`, `@Query('queryArg') query: string`, etc. cases.
        return value
      }

      throw createValidationException(
        new Error('All input must define a schema')
      )
    }
  }

  return ZodValidationPipe
}

const PRIMITIVE_TYPES = new Map<
  unknown,
  'string' | 'boolean' | 'bigint' | 'number'
>([
  [String, 'string'],
  [Boolean, 'boolean'],
  [Number, 'number'],
  [BigInt, 'bigint'],
])

export const ZodValidationPipe = createZodValidationPipe()
