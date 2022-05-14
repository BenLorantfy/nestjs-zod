import { BadRequestException } from '@nestjs/common'
import { ZodError, ZodIssue } from 'zod'

export class ZodValidationException extends BadRequestException {
  errors: ZodIssue[]

  constructor(private error: ZodError) {
    super('Validation failed')
    this.errors = error.errors
  }

  public getZodError() {
    return this.error
  }
}

export type ZodExceptionCreator = (error: ZodError) => Error

export const createZodValidationException: ZodExceptionCreator = (error) => {
  return new ZodValidationException(error)
}
