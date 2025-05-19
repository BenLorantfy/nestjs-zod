import { UnknownSchema } from './types'
import type * as z3 from 'zod/v3';
import type * as z4 from "zod/v4/core";
import { type JSONSchema, toJSONSchema, globalRegistry } from 'zod/v4/core';
import { zodToOpenAPI } from './openapi';

const schemaRegistry = new Map<string, ZodDto<UnknownSchema>>();

export interface ZodDto<
  TSchema extends UnknownSchema
> {
  new (): ReturnType<TSchema['parse']>
  isZodDto: true
  schema: TSchema
  create(input: unknown): ReturnType<TSchema['parse']>
  _OPENAPI_METADATA_FACTORY(): unknown
}

export function createZodDto<
  TSchema extends UnknownSchema|z3.ZodTypeAny|(z4.$ZodType & { parse: (input: unknown) => unknown })
>(schema: TSchema) {
  class AugmentedZodDto {
    public static isZodDto = true
    public static schema = schema

    public static create(input: unknown) {
      return this.schema.parse(input)
    }

    public static _OPENAPI_METADATA_FACTORY() {
      if ('_zod' in this.schema) {
        return markRequiredPropertiesAsRequired(
          convertDefRefsToDtoType(toJSONSchema(this.schema, {
            io: 'input',
            // override: (ctx) => {
            //     // nullable
            //     if (Object.keys(ctx.jsonSchema).length === 1 && ctx.jsonSchema.anyOf && ctx.jsonSchema.anyOf.length === 2 && ctx.jsonSchema.anyOf[1].type === 'null' && typeof ctx.jsonSchema.anyOf?.[0] === 'object') {
            //         // Note: nestjs/swagger doesn't like how zod generates nullable types like this:
            //         // {
            //         //     "anyOf": [
            //         //         { "type": "object" },
            //         //         { "type": "null" }
            //         //     ]
            //         // }
            //         // It outputs the following error:
            //         // ```
            //         // Error: A circular dependency has been detected
            //         // ```
            //         // So we need to convert it to a more swagger-friendly format:
            //         // {
            //         //     "type": "object",
            //         //     "nullable": true
            //         // }
                    
            //         const firstType = ctx.jsonSchema.anyOf[0];
            //         delete ctx.jsonSchema.anyOf;
            //         Object.assign(ctx.jsonSchema, firstType);
            //         ctx.jsonSchema.nullable = true;
            //     }
            // }
          }) as any) as any
        ).properties;
      }

      if ('_def' in this.schema) {
        return markRequiredPropertiesAsRequired(zodToOpenAPI(this.schema)).properties;
      }

      return {};
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TSchema>
}

/**
 * Registers a zod DTO so that it can be reused and referenced in other schemas.
 * This is only needed if you're trying to reuse a schema instead of duplicating
 * it in the outputted OpenAPI spec.
 * 
 * @param dto - A zod DTO returned by `createZodDto`
 */
export function registerZodDto(dto: ZodDto<UnknownSchema>) {
  if (!('_zod' in dto.schema)) {
    throw new Error('[nestjs-zod/registerZodDto] Only zod v4 schemas are supported');
  }

  // @ts-expect-error
  const schemaMetadata = globalRegistry.get(dto.schema);
  if (!schemaMetadata) {
    throw new Error('[nestjs-zod/registerZodDto] Only zod schemas that have meta({ id: ... }) called on them are supported');
  }

  const schemaId = schemaMetadata.id;
  if (!schemaId) {
    throw new Error('[nestjs-zod/registerZodDto] Please ensure `meta` is called on the zod schema with `id`. E.g. `meta({ id: "MySchemaId" })`');
  }

  schemaRegistry.set(schemaId, dto);
}

/**
 * When we call `z.toJSONSchema` on a zod schema that has a nested schema with
 * `meta({ id: 'Author' })`, it generates a structure that looks like this:
 * ```ts
 * {
 *   properties: {
 *     author: {
 *       $ref: '#/$defs/Author',
 *     },
 *     title: {
 *       type: 'string',
 *     }
 *   },
 *   $defs: {
 *     Author: {
 *       type: 'object',
 *       properties: {
 *         name: { type: 'string' },
 *       },
 *     }
 *   }
 * }
 * ```
 * 
 * nestjs/swagger doesn't know what to do with this.  This function converts to
 * this structure:
 * ```ts
 * {
 *   properties: {
 *     author: {
 *       type: AuthorDto,
 *     },
 *     title: {
 *       type: 'string',
 *     }
 *   }
 * }
 * ```
 * Which `nestjs/swagger` knows how to handle.  `nestjs/swagger` internally removes
 * `type: AuthorDto` and replaces it with `$ref: '#/components/schemas/AuthorDto'` when 
 * it generates the OpenAPI spec.
 * 
 * @note This function mutates the input.
 */
function convertDefRefsToDtoType(jsonSchema: JSONSchema.Schema): unknown {
  if (jsonSchema.type === 'object') {
    for (let key in jsonSchema.properties) {
      const schema = jsonSchema.properties[key];
      // @ts-expect-error
      convertDefRefsToDtoType(schema);
    }
  } else if (jsonSchema.type === 'array') {
    // @ts-expect-error
    convertDefRefsToDtoType(jsonSchema.items);
  } else if (jsonSchema.$ref) {
    const parts = jsonSchema.$ref.split('/');
    if (parts.length === 3 && parts[0] === '#' && parts[1] === '$defs') {
      const schemaId = parts[2];
      const dto = schemaRegistry.get(schemaId);
      if (!dto) {
        throw new Error(`[nestjs-zod] No dto found for schema id: ${schemaId}.  Please ensure you have called registerZodDto with the schema`);
      }

      delete jsonSchema.$ref;
      // @ts-expect-error
      jsonSchema.type = dto;
    }
  }

  return jsonSchema;
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

export function isZodDto(metatype: unknown): metatype is ZodDto<UnknownSchema> {
  return Boolean(metatype && (typeof metatype === 'object' || typeof metatype === 'function') && 'isZodDto' in metatype && metatype.isZodDto);
}
