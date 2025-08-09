import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ZodSerializerDto } from './serializer';
import { ZodDto } from './dto';
import { assert } from './assert';
import { input } from 'zod/v4/core';
import { RequiredBy, UnknownSchema } from './types';

/**
 * `@ZodResponse` can be used to set the response DTO for a method
 *
 * It actually does a few things:
 * 1. Serializes the return value of the method using `@ZodSerializerDto`.  This
 *    means the return value of the method will be parsed by the DTO's schema.
 * 2. Sets the response DTO for the method using `@ApiResponse`.  This means the
 *    OpenAPI documentation will be updated to reflect the DTO's schema.  Note
 *    that ZodResponse automatically uses the output version of the DTO, so
 *    there is no need to use DTO.Output.
 * 3. Throws a typescript error if the return value of the method does not match
 *    the DTO's input schema.
 *
 * It's recommended to use this decorator because it will keep the
 * serialization, OpenAPI documentation, and compile-time type checking in sync
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
export function ZodResponse<TSchema extends UnknownSchema>({ status, description, type }: { status: number, description: string, type: ZodDto<TSchema> & { io: "input" } }): (target: object, propertyKey?: string | symbol, descriptor?: Pick<TypedPropertyDescriptor<(...args: any[]) => input<TSchema>|Promise<input<TSchema>>>, 'value'>) => void
export function ZodResponse<TSchema extends RequiredBy<UnknownSchema, 'array'>>({ status, description, type }: { status: number, description: string, type: [ZodDto<TSchema> & { io: "input" }] }): (target: object, propertyKey?: string | symbol, descriptor?: Pick<TypedPropertyDescriptor<(...args: any[]) => Array<input<TSchema>>|Promise<Array<input<TSchema>>>>, 'value'>) => void
export function ZodResponse<TSchema extends UnknownSchema>({ status, description, type }: { status: number, description: string, type: (ZodDto<TSchema> & { io: "input" })|[ZodDto<TSchema> & { io: "input" }] }): (target: object, propertyKey?: string | symbol, descriptor?: Pick<TypedPropertyDescriptor<(...args: any[]) => Array<input<TSchema>>|Promise<Array<input<TSchema>>>|input<TSchema>|Promise<input<TSchema>>>, 'value'>) => void {
  if (Array.isArray(type)) {
    assert(type[0].io === "input", 'ZodResponse automatically uses the output version of the DTO, there is no need to use DTO.Output');

    return applyDecorators(
      ZodSerializerDto(type),
      ApiResponse({ status, description, type: ['_zod' in type[0].schema ? type[0].Output : type[0]] }),
    )

  } else {
    assert(type.io === "input", 'ZodResponse automatically uses the output version of the DTO, there is no need to use DTO.Output');

    return applyDecorators(
      ZodSerializerDto(type),
      ApiResponse({ status, description, type: '_zod' in type.schema ? type.Output : type }),
    )
  }
}

