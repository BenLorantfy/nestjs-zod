import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common'
import { ZodSchema } from 'zod'
import { createZodValidationException, ZodExceptionCreator } from './exception'
import { Source } from './shared/types'

interface ZodBodyGuardOptions {
  createValidationException?: ZodExceptionCreator
}

type ZodGuardClass = new (source: Source, schema: ZodSchema) => CanActivate

export function createZodGuard({
  createValidationException = createZodValidationException,
}: ZodBodyGuardOptions = {}): ZodGuardClass {
  @Injectable()
  class ZodGuard {
    constructor(private source: Source, private schema: ZodSchema) {}

    canActivate(context: ExecutionContext) {
      const data = context.switchToHttp().getRequest()[this.source]

      const result = this.schema.safeParse(data)

      if (!result.success) {
        throw createValidationException(result.error)
      }

      return true
    }
  }

  return ZodGuard
}

export const ZodGuard = createZodGuard()

export const UseZodGuard = (source: Source, schema: ZodSchema) =>
  UseGuards(new ZodGuard(source, schema))
