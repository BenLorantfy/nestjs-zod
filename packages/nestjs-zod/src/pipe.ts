import { ArgumentMetadata, Injectable, InternalServerErrorException, Optional, PipeTransform } from '@nestjs/common'
import { isZodDto, ZodDto } from './dto'
import { ZodExceptionCreator } from './exception'
import { validate } from './validate'
import { UnknownSchema } from './types'

interface ZodValidationPipeOptions {
  /**
   * Use this to customize the exception that is thrown when validation fails
   */
  createValidationException?: ZodExceptionCreator
  
  /**
   * If `true`, then an error will be thrown if the pipe tries to validate a
   * value that is not typed with a nestjs-zod DTO
   * 
   * It's recommended to set this to `true`, since it will catch cases where
   * we're not properly validating data
   */
  strictSchemaDeclaration?: boolean
}

type ZodValidationPipeClass = new (
  schemaOrDto?: UnknownSchema | ZodDto
) => PipeTransform

export class ZodSchemaDeclarationException extends InternalServerErrorException {
  constructor() {
    super();
  }
}

export function createZodValidationPipe({
  createValidationException,
  strictSchemaDeclaration = false,
}: ZodValidationPipeOptions = {}): ZodValidationPipeClass {
  @Injectable()
  class ZodValidationPipe implements PipeTransform {
    constructor(@Optional() private schemaOrDto?: UnknownSchema | ZodDto) {}

    public transform(value: unknown, metadata: ArgumentMetadata) {
      if (this.schemaOrDto) {
        return validate(value, this.schemaOrDto, createValidationException)
      }

      const { metatype } = metadata

      if (!isZodDto(metatype)) {
        if (strictSchemaDeclaration) {
          throw new ZodSchemaDeclarationException();
        }
        return value
      }

      return validate(value, metatype.schema, createValidationException)
    }
  }

  return ZodValidationPipe
}

export const ZodValidationPipe = createZodValidationPipe()
