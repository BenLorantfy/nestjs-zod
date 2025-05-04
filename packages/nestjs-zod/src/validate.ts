import { isZodDto, ZodDto } from './dto'
import { createZodValidationException, ZodExceptionCreator } from './exception'
import { ZodSchema } from './types'

/**
 * @deprecated `validate` will be removed in a future version.  It is
 * recommended to use `.parse` directly
 */
export function validate<TOutput, TSchema extends ZodSchema<TOutput>>(
  value: unknown,
  schemaOrDto: TSchema | ZodDto<TOutput, TSchema>,
  createValidationException: ZodExceptionCreator = createZodValidationException
) {
  const schema = isZodDto(schemaOrDto) ? schemaOrDto.schema : schemaOrDto

  const result = schema.safeParse(value)

  if (!result.success) {
    throw createValidationException(result.error)
  }

  return result.data
}
