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

/**
 * @deprecated `createZodGuard` will be removed in a future version, since
 * guards are not intended for validation purposes.
 */
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

/**
 * @deprecated `ZodGuard` will be removed in a future version, since guards
 * are not intended for validation purposes.
 */
export const ZodGuard = createZodGuard()

/**
 * @deprecated `UseZodGuard` will be removed in a future version, since guards
 * are not intended for validation purposes.
 */
export const UseZodGuard = (source: Source, schemaOrDto: ZodSchema | ZodDto) =>
  UseGuards(new ZodGuard(source, schemaOrDto))
