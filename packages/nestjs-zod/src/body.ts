import { Body } from '@nestjs/common';
import { ZodDto } from './dto';
import { UnknownSchema } from './types';

const PARAMTYPES_METADATA = 'design:paramtypes';

/**
 * `@ZodBody` is a specialized decorator for a complete union request body.
 * It lets the parameter use the schema's inferred type while the application's
 * global `ZodValidationPipe` validates with the DTO class.
 *
 * This is especially useful for union schemas, whose DTO instance type is
 * intentionally widened to `object` because TypeScript cannot extend a class
 * with a union instance type.
 *
 * This is not a replacement for `@Body()`: property extraction and
 * parameter-level pipes are intentionally unsupported.
 *
 * @example
 * ```ts
 * type Command = z.infer<typeof CommandDto.schema>;
 *
 * create(@ZodBody(CommandDto) command: Command) {}
 * ```
 */
export function ZodBody<TSchema extends UnknownSchema>(
  dto: ZodDto<TSchema, boolean>,
): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) {
      throw new Error('@ZodBody can only decorate a method parameter');
    }

    Body()(target, propertyKey, parameterIndex);

    // Nest reads this metadata to provide the DTO class to global pipes.
    const parameterTypes: unknown[] = [
      ...(Reflect.getMetadata(PARAMTYPES_METADATA, target, propertyKey) || []),
    ];
    parameterTypes[parameterIndex] = dto;
    Reflect.defineMetadata(
      PARAMTYPES_METADATA,
      parameterTypes,
      target,
      propertyKey,
    );
  };
}
