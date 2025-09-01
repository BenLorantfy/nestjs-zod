import { applyDecorators, HttpCode } from '@nestjs/common'
import { input } from 'zod/v4/core'
import { assert } from './assert'
import { ZodDto } from './dto'
import { ZodSerializerDto } from './serializer'
import { RequiredBy, UnknownSchema } from './types'

let ApiResponse: typeof import('@nestjs/swagger').ApiResponse | undefined
try {
  ApiResponse = require('@nestjs/swagger').ApiResponse
} catch (error) {}

/**
 * `@ZodResponse` can be used to set the response information for a method.
 * This is the recommended way to handle responses, since it applies a few
 * related decorators at once to keep them in sync:
 *
 * 1. Uses `@ZodSerializerDto` to serialize the return value of the method.  This
 *    means the return value of the method will be parsed by the DTO's schema.
 * 2. Uses `@ApiResponse` to set the response DTO for the method.  This means
 *    the OpenAPI documentation will be updated to reflect the DTO's schema.
 *    Note that ZodResponse automatically uses the output version of the DTO, so
 *    there is no need to use DTO.Output.
 * 3. Uses `@HttpCode` to set the HTTP status code for the response if `status`
 *    is provided
 * 4. Lastly, it also throws a typescript error if the return value of the
 *    method does not match the DTO's input schema.
 *
 * `@ZodResponse` is powerful because it keeps the run-time, compile-time, and
 * docs-time response representations in sync
 *
 *
 * @example
 * ```ts
 * @Get()
 * @ZodResponse({ status: 200, description: 'Get book', type: BookDto })
 * getBook() {
 *   return { id: '1' };
 * }
 * ```
 *
 * @example
 * ```ts
 * @Get()
 * @ZodResponse({ status: 200, description: 'Get books', type: [BookDto] })
 * getBooks() {
 *   return [{ id: '1' }, { id: '2' }];
 * }
 */
export function ZodResponse<TSchema extends UnknownSchema>({
  status,
  description,
  type,
}: {
  status?: number
  description?: string
  type: ZodDto<TSchema> & { io: 'input' }
}): (
  target: object,
  propertyKey?: string | symbol,
  descriptor?: Pick<
    TypedPropertyDescriptor<
      (...args: any[]) => input<TSchema> | Promise<input<TSchema>>
    >,
    'value'
  >
) => void
export function ZodResponse<
  TSchema extends RequiredBy<UnknownSchema, 'array'>
>({
  status,
  description,
  type,
}: {
  status?: number
  description?: string
  type: [ZodDto<TSchema> & { io: 'input' }]
}): (
  target: object,
  propertyKey?: string | symbol,
  descriptor?: Pick<
    TypedPropertyDescriptor<
      (...args: any[]) => Array<input<TSchema>> | Promise<Array<input<TSchema>>>
    >,
    'value'
  >
) => void
export function ZodResponse<TSchema extends UnknownSchema>({
  status,
  description,
  type,
}: {
  status?: number
  description?: string
  type:
    | (ZodDto<TSchema> & { io: 'input' })
    | [ZodDto<TSchema> & { io: 'input' }]
}): (
  target: object,
  propertyKey?: string | symbol,
  descriptor?: Pick<
    TypedPropertyDescriptor<
      (
        ...args: any[]
      ) =>
        | Array<input<TSchema>>
        | Promise<Array<input<TSchema>>>
        | input<TSchema>
        | Promise<input<TSchema>>
    >,
    'value'
  >
) => void {
  assert(ApiResponse, 'ZodResponse requires @nestjs/swagger to be installed')

  if (Array.isArray(type)) {
    assert(
      type[0].io === 'input',
      'ZodResponse automatically uses the output version of the DTO, there is no need to use DTO.Output'
    )

    return applyDecorators(
      ...[
        ...(status ? [HttpCode(status)] : []),
        ZodSerializerDto(type),
        ApiResponse({
          status,
          description,
          type: ['_zod' in type[0].schema ? type[0].Output : type[0]],
        }),
      ]
    )
  }
  assert(
    type.io === 'input',
    'ZodResponse automatically uses the output version of the DTO, there is no need to use DTO.Output'
  )

  return applyDecorators(
    ...[
      ...(status ? [HttpCode(status)] : []),
      ZodSerializerDto(type),
      ApiResponse({
        status,
        description,
        type: '_zod' in type.schema ? type.Output : type,
      }),
    ]
  )
}
