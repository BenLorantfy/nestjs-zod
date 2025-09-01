import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common'

export class ZodValidationException extends BadRequestException {
  constructor(private error: unknown) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      errors: (error && typeof error === 'object' && 'issues' in error) ? error.issues : undefined,
    })
  }

  public getZodError() {
    return this.error
  }
}

export class ZodSerializationException extends InternalServerErrorException {
  constructor(private error: unknown) {
    super()
  }

  public getZodError() {
    return this.error
  }
}

export type ZodExceptionCreator = (error: unknown) => Error

export const createZodValidationException: ZodExceptionCreator = (error) => {
  return new ZodValidationException(error)
}

export const createZodSerializationException: ZodExceptionCreator = (error) => {
  return new ZodSerializationException(error)
}
