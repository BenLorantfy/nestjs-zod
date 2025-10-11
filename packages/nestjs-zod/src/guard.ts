import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common'
import { ZodDto } from './dto'
import { ZodExceptionCreator } from './exception'
import { validate } from './validate'
import { UnknownSchema } from './types'

export type Source = 'body' | 'query' | 'params'

interface ZodBodyGuardOptions {
  createValidationException?: ZodExceptionCreator
}

type ZodGuardClass = new (
  source: Source,
  schemaOrDto: UnknownSchema | ZodDto
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
      private schemaOrDto: UnknownSchema | ZodDto
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
export const UseZodGuard = (source: Source, schemaOrDto: UnknownSchema | ZodDto) =>
  UseGuards(new ZodGuard(source, schemaOrDto))
