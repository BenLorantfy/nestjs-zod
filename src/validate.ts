import { ZodSchema } from 'zod'
import { isZodDto, ZodDto } from './dto'
import { createZodValidationException, ZodExceptionCreator } from './exception'

export function validate(
  value: unknown,
  schemaOrDto: ZodSchema | ZodDto,
  createValidationException: ZodExceptionCreator = createZodValidationException
) {
  const schema = isZodDto(schemaOrDto) ? schemaOrDto.schema : schemaOrDto

  const result = schema.safeParse(value)

  if (!result.success) {
    throw createValidationException(result.error)
  }

  return result.data
}
