import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common'
import { isZodDto, ZodDto } from './dto'
import { createZodValidationException, ZodExceptionCreator } from './exception'
import { ZodSchema } from './z'

interface ZodValidationPipeOptions {
  createValidationException?: ZodExceptionCreator
}

type ZodValidationPipeClass = new (
  schemaOrDto?: ZodSchema | ZodDto
) => PipeTransform

export function createZodValidationPipe({
  createValidationException = createZodValidationException,
}: ZodValidationPipeOptions = {}): ZodValidationPipeClass {
  @Injectable()
  class ZodValidationPipe implements PipeTransform {
    constructor(private schemaOrDto?: ZodSchema | ZodDto) {}

    private validate(value: unknown, schema: ZodSchema) {
      const result = schema.safeParse(value)

      if (!result.success) {
        throw createValidationException(result.error)
      }

      return result.data
    }

    public transform(value: unknown, metadata: ArgumentMetadata) {
      if (this.schemaOrDto) {
        const schema = isZodDto(this.schemaOrDto)
          ? this.schemaOrDto.schema
          : this.schemaOrDto

        return this.validate(value, schema)
      }

      const { metatype } = metadata

      if (!isZodDto(metatype)) {
        return value
      }

      return this.validate(value, metatype.schema)
    }
  }

  return ZodValidationPipe
}

export const ZodValidationPipe = createZodValidationPipe()
