import { UnknownSchema } from './types'
import type * as z3 from 'zod/v3';
import { toJSONSchema, $ZodType, JSONSchema } from "zod/v4/core";
import { assert } from './assert';
import { DEFS_KEY, EMPTY_TYPE_KEY, PARENT_ID_KEY, PREFIX } from './const';

export interface ZodDto<
  TSchema extends UnknownSchema
> {
  new (): ReturnType<TSchema['parse']>
  isZodDto: true
  schema: TSchema
  create(input: unknown): ReturnType<TSchema['parse']>
  Output: ZodDto<UnknownSchema>
  _OPENAPI_METADATA_FACTORY(): unknown
}

export function createZodDto<
  TSchema extends UnknownSchema|z3.ZodTypeAny|($ZodType & { parse: (input: unknown) => unknown })
>(schema: TSchema) {
  class AugmentedZodDto {
    public static readonly isZodDto = true
    public static readonly schema = schema

    public static create(input: unknown) {
      return this.schema.parse(input)
    }

    static get Output() {
      // TODO: throw error if schema is not a v4 zod schema

      class AugmentedZodDto {
        public static readonly isZodDto = true
        public static readonly schema = schema
    
        public static create(input: unknown) {
          return this.schema.parse(input)
        }

        public static _OPENAPI_METADATA_FACTORY() {
          return openApiMetadataFactory(this.schema, "output");
        }
      }

      Object.defineProperty(AugmentedZodDto, 'name', { value: `${this.name}_Output` });

      return AugmentedZodDto;
    }

    public static _OPENAPI_METADATA_FACTORY() {
      return openApiMetadataFactory(this.schema, "input");
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TSchema>
}

function openApiMetadataFactory(schema: UnknownSchema | z3.ZodTypeAny | ($ZodType & { parse: (input: unknown) => unknown; }), io: 'input' | 'output') {
  if ('_zod' in schema) {
    const jsonSchema = toJSONSchema(schema, {
      io,
      override: ({ jsonSchema }) => {
          if (io === 'output' && 'id' in jsonSchema) {
              jsonSchema.id = `${jsonSchema.id}_Output`;
          }
      } 
    });

    assert(isObjectType(jsonSchema), 'createZodDto must be called with an object type');

    let properties: Record<string, unknown> = {};
    for (let [propertyKey, propertySchema] of Object.entries(jsonSchema.properties)) {
      const newPropertySchema: Record<string, unknown> = {
        // TOOD: figure out why this fails at compile time
        ...(propertySchema as Record<string, unknown>),

        // Note: nestjs throws the following error message if `type` is
        // missing on the schema: 
        // 
        // > A circular dependency has been detected...
        //
        // This error message is not accurate.  There is no circular
        // dependency.  However, as a workaround, we need to set `type` to
        // an empty string so nestjs does not throw an error
        //
        // An empty string is not a valid value for `type` as per jsonSchema
        // standards, but we clean this up and remove this field in
        // `cleanupOpenApiDoc`
        type: propertySchema.type || '', 
      };

      // Add a marker so we know to clean this up.  We could just remove any
      // empty type, but we really only want to remove the empty types we
      // added
      if (typeof propertySchema.type !== 'string') {
        newPropertySchema[EMPTY_TYPE_KEY] = true;
      }

      // nestjs expects us to return a record of properties, instead of a
      // proper jsonschema.  Because nestjs doesn't expect a jsonschema, the
      // `required: ["field1", "field2"]` mechanism isn't available to us.
      //
      // As an apparent (and undocumented) workaround, nestjs expects you to
      // return `selfRequired: true` (for objects) or `required: true` (for
      // non-objects) if the field is required
      const required = jsonSchema.required?.includes(propertyKey);
      if (newPropertySchema.type === 'object') {
        newPropertySchema.selfRequired = required;
      } else {
        newPropertySchema.required = required;
      }

      // nestjs expects us to return a record of properties, instead of a
      // proper jsonschema.  This means the $defs object on the root schema
      // is lost. Here, we add $defs to each property instead, under a custom
      // field name
      if (jsonSchema.$defs) {
        newPropertySchema[DEFS_KEY] = jsonSchema.$defs;
      }

      // nestjs expects us to return a record of properties, instead of a
      // proper jsonschema.  This means `id` is lost.  So here, we add it
      // back to each property, under a custom field name
      if (jsonSchema.id) {
        newPropertySchema[PARENT_ID_KEY] = jsonSchema.id;
      }

      properties[propertyKey] = newPropertySchema;
    }


    return properties;
  }

  // TODO: handle zod v3 here
  return {};
}

// /**
//  * _OPENAPI_METADATA_FACTORY expects an object with properties like this:
//  * ```
//  * {
//  *   a: { type: 'string', required: true },
//  * }
//  * ```
//  * Instead of a proper JSONSchema like this:
//  * ```
//  * {
//  *   type: 'object',
//  *   properties: {
//  *     a: { type: 'string' },
//  *   },
//  *   required: ['a'],
//  * }
//  * ```
//  * This function converts the proper JSONSchema into the format
//  * _OPENAPI_METADATA_FACTORY expects, by adding `selfRequired: true` or
//  * `required: true` where needed, based of  the top-level `required` array.
//  */
// export function markRequiredPropertiesAsRequired(schema: {
//   properties?: Record<string, {}>;
//   required?: string[];
// }) {
//   if (!schema.properties) return schema;
//   return {
//     ...schema,
//     properties: Object.keys(schema.properties).reduce((acc, key) => {
//       const subSchema = schema.properties![key]

//       if ('type' in subSchema && subSchema.type === 'object') {
//         acc[key] = {
//           ...subSchema,
//           // selfRequired seems to be needed to tell nest/swagger that the property is required, when the property is an object.
//           // I think this is an undocumented feature of nest/swagger.  I don't think it's part of the OpenAPI schema.
//           // @see https://github.com/nestjs/swagger/pull/3347/files#diff-bd4375f8c339aca69690041a14da31752c1d4707eba6eb1129e5922454d3c7d4R272
//           selfRequired: !!schema.required?.includes(key),
//         }
//       } else {
//         acc[key] = {
//           ...subSchema,
//           // selfRequired doesn't seem to work when the property is not an
//           // object, but `required` does. Using required like this is also not
//           // part of the OpenAPI schema, but nest/swagger seems to support it
//           required: !!schema.required?.includes(key),
//         }
//       }
//       return acc
//     }, {} as Record<string, unknown>)
//   }
// }

export function isZodDto(metatype: unknown): metatype is ZodDto<UnknownSchema> {
  return Boolean(metatype && (typeof metatype === 'object' || typeof metatype === 'function') && 'isZodDto' in metatype && metatype.isZodDto);
}

function isObjectType(jsonSchema: JSONSchema.BaseSchema): jsonSchema is JSONSchema.BaseSchema & { type: 'object', required?: string[]; properties: Record<string, Record<string, unknown>> } {
  return jsonSchema.type === 'object' && 'properties' in jsonSchema && typeof jsonSchema.properties === 'object' && !!jsonSchema.properties;
}
