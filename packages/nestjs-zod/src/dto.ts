import { UnknownSchema } from './types'
import type * as z3 from 'zod/v3';
import type * as z4 from "zod/v4/core";
import { type JSONSchema, toJSONSchema, globalRegistry } from 'zod/v4/core';
import { zodToOpenAPI } from './openapi';
import { walkJsonSchema } from './walkJsonSchema';

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
        const meta = globalRegistry.get(this.schema);

        const baseSchema = toJSONSchema(this.schema, {
          io: 'input',
          override: (ctx) => {
              if (Object.keys(ctx.jsonSchema).length === 1 && ctx.jsonSchema.anyOf && ctx.jsonSchema.anyOf.length === 2 && ctx.jsonSchema.anyOf[1].type === 'null' && typeof ctx.jsonSchema.anyOf?.[0] === 'object') {
                  // Note: nestjs/swagger doesn't like how zod generates nullable types like this:
                  // {
                  //     "anyOf": [
                  //         { "type": "object" },
                  //         { "type": "null" }
                  //     ]
                  // }
                  // It outputs the following error:
                  // ```
                  // Error: A circular dependency has been detected
                  // ```
                  // So we need to convert it to a more swagger-friendly format:
                  // {
                  //     "type": "object",
                  //     "nullable": true
                  // }
                  
                  const firstType = ctx.jsonSchema.anyOf[0];
                  delete ctx.jsonSchema.anyOf;
                  Object.assign(ctx.jsonSchema, firstType);
                  ctx.jsonSchema.nullable = true;
              }
          }
        })

        // @ts-expect-error
        const withParentSchemaId = addSchemaIdToAllProperties(meta?.id, baseSchema);

        const withZodRefMarker = temporarilyRemoveZodRefs(withParentSchemaId);

        // @ts-expect-error
        return markRequiredPropertiesAsRequired(withZodRefMarker).properties;
      }

      if ('_def' in this.schema) {
        return markRequiredPropertiesAsRequired(zodToOpenAPI(this.schema)).properties;
      }

      return {};
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TSchema>
}


function addSchemaIdToAllProperties(schemaId: string|undefined, schema: JSONSchema.Schema) {
  if (!schemaId) {
    return schema;
  }
  if (schema.type === 'object' && 'properties' in schema) {
    const properties = schema.properties || {};
    for (const [key, value] of Object.entries(properties)) {
      properties[key]['x-__nestjs-zod__parent-schema-id'] = schemaId;
    }
  }
  return schema;
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
 * But nestjs/swagger throws an error when it sees `$ref` and no `type`.  This
 * function temporarily converts `$ref` to `x-zod-ref`, and then adds `type:
 * object` so nestjs/swagger can understand it.  The `cleanupOpenApiDoc`
 * function restores the original `$ref` and also adds to the components section
 * 
 * @note This function mutates the input.
 */
function temporarilyRemoveZodRefs(jsonSchema: JSONSchema.Schema) {
  return walkJsonSchema(jsonSchema, (schema) => {
    if (schema.$ref && schema.$ref.startsWith('#/$defs/')) {
      const { $ref, ...rest } = schema;
      return {
        ...rest,
        type: rest.type || 'object',
        'x-zod-ref': $ref
      }
    }
    return schema;
  });
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
