/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodToOpenAPI } from './openapi/zod-to-openapi'
import { ZodSchema } from './types'

export interface ZodDto<
  TOutput,
  TSchema extends ZodSchema<TOutput>
> {
  new (): TOutput
  isZodDto: true
  schema: TSchema
  create(input: unknown): TOutput
  _OPENAPI_METADATA_FACTORY(): unknown
}

export function createZodDto<
  TOutput = any,
  TSchema extends ZodSchema<TOutput> = ZodSchema<TOutput>
>(schema: TSchema) {
  class AugmentedZodDto {
    public static isZodDto = true
    public static schema = schema

    public static create(input: unknown) {
      return this.schema.parse(input)
    }

    public static _OPENAPI_METADATA_FACTORY() {
      // @ts-expect-error `zodToOpenAPI` only works with v3 schemas
      const schemaObject = zodToOpenAPI(this.schema);
      return markRequiredPropertiesAsRequired(schemaObject).properties;
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TOutput, TSchema>
}

/**
 * _OPENAPI_METADATA_FACTORY expects an object with properties like this:
 * ```
 * {
 *   a: { type: 'string', required: true },
 * }
 * ```
 * Instead of a proper JSONSchema like this:
 * ```
 * {
 *   type: 'object',
 *   properties: {
 *     a: { type: 'string' },
 *   },
 *   required: ['a'],
 * }
 * ```
 * This function converts the proper JSONSchema into the format
 * _OPENAPI_METADATA_FACTORY expects, by adding `selfRequired: true` or
 * `required: true` where needed, based of  the top-level `required` array.
 */
export function markRequiredPropertiesAsRequired(schema: {
  properties?: Record<string, {}>;
  required?: string[];
}) {
  if (!schema.properties) return schema;
  return {
    ...schema,
    properties: Object.keys(schema.properties).reduce((acc, key) => {
      const subSchema = schema.properties![key]

      if ('type' in subSchema && subSchema.type === 'object') {
        acc[key] = {
          ...subSchema,
          // selfRequired seems to be needed to tell nest/swagger that the property is required, when the property is an object.
          // I think this is an undocumented feature of nest/swagger.  I don't think it's part of the OpenAPI schema.
          // @see https://github.com/nestjs/swagger/pull/3347/files#diff-bd4375f8c339aca69690041a14da31752c1d4707eba6eb1129e5922454d3c7d4R272
          selfRequired: !!schema.required?.includes(key),
        }
      } else {
        acc[key] = {
          ...subSchema,
          // selfRequired doesn't seem to work when the property is not an
          // object, but `required` does. Using required like this is also not
          // part of the OpenAPI schema, but nest/swagger seems to support it
          required: !!schema.required?.includes(key),
        }
      }
      return acc
    }, {} as Record<string, unknown>)
  }
}

export function isZodDto(metatype: unknown): metatype is ZodDto<unknown, ZodSchema<unknown>> {
  return Boolean(metatype && (typeof metatype === 'object' || typeof metatype === 'function') && 'isZodDto' in metatype && metatype.isZodDto);
}
