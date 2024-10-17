import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common'
import { ZodDto } from './dto'
import { ZodExceptionCreator } from './exception'
import { Source } from './shared/types'
import { validate } from './validate'
import { ZodSchema } from '@nest-zod/z'

interface ZodBodyGuardOptions {
  createValidationException?: ZodExceptionCreator
}

type ZodGuardClass = new (
  source: Source,
  schemaOrDto: ZodSchema | ZodDto
) => CanActivate

export function createZodGuard({
  createValidationException,
}: ZodBodyGuardOptions = {}): ZodGuardClass {
  @Injectable()
  class ZodGuard {
    constructor(
      private source: Source,
      private schemaOrDto: ZodSchema | ZodDto
    ) {}

    canActivate(context: ExecutionContext) {
      const data = context.switchToHttp().getRequest()[this.source]

      validate(data, this.schemaOrDto, createValidationException)

      return true
    }
  }

  return ZodGuard
}

export const ZodGuard = createZodGuard()

export const UseZodGuard = (source: Source, schemaOrDto: ZodSchema | ZodDto) =>
  UseGuards(new ZodGuard(source, schemaOrDto))
