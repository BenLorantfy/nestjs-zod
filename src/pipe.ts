import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common'
import { isZodDto } from './dto'
import { createZodValidationException, ZodExceptionCreator } from './exception'
import { ZodSchema } from './z'

interface ZodValidationPipeOptions {
  createValidationException?: ZodExceptionCreator
}

export function createZodValidationPipe({
  createValidationException = createZodValidationException,
}: ZodValidationPipeOptions = {}): new () => PipeTransform {
  @Injectable()
  class ZodValidationPipe implements PipeTransform {
    constructor(private schema?: ZodSchema) {}

    private validate(value: unknown, schema: ZodSchema) {
      const result = schema.safeParse(value)

      if (!result.success) {
        throw createValidationException(result.error)
      }

      return result.data
    }

    public transform(value: unknown, metadata: ArgumentMetadata) {
      if (this.schema) {
        return this.validate(value, this.schema)
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
