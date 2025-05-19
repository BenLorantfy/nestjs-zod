import { isZodDto, ZodDto } from './dto'
import { createZodValidationException, ZodExceptionCreator } from './exception'
import { UnknownSchema } from './types'

/**
 * @deprecated `validate` will be removed in a future version.  It is
 * recommended to use `.parse` directly
 */
export function validate<TSchema extends UnknownSchema>(
  value: unknown,
  schemaOrDto: TSchema | ZodDto<TSchema>,
  createValidationException: ZodExceptionCreator = createZodValidationException
): ReturnType<TSchema['parse']> {
  const schema = isZodDto(schemaOrDto) ? schemaOrDto.schema : schemaOrDto

  try {
    return schema.parse(value) as ReturnType<TSchema['parse']>
  } catch (error) {
    throw createValidationException(error)
  }
}
