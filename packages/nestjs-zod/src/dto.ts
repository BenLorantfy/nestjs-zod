import { UnknownSchema } from './types'
import type * as z3 from 'zod/v3';
import { toJSONSchema, $ZodType, JSONSchema } from "zod/v4/core";
import { assert } from './assert';
import { EMPTY_TYPE_KEY, PREFIX } from './const';
import { walkJsonSchema } from './utils';
import { zodV3ToOpenAPI } from './zodV3ToOpenApi';

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
    public static readonly io = "input"

    public static create(input: unknown) {
      return this.schema.parse(input)
    }

    static get Output() {
      assert('_zod' in schema, 'Output DTOs can only be created from zod v4 schemas')

      class AugmentedZodDto {
        public static readonly isZodDto = true
        public static readonly schema = schema
        public static readonly io = "output"

        public static create(input: unknown) {
          return this.schema.parse(input)
        }

        public static _OPENAPI_METADATA_FACTORY() {
          return openApiMetadataFactory({ schema: this.schema, io: "output" });
        }
      }

      Object.defineProperty(AugmentedZodDto, 'name', { value: `${this.name}_Output` });

      return AugmentedZodDto;
    }

    public static _OPENAPI_METADATA_FACTORY() {
      return openApiMetadataFactory({ schema: this.schema, io: "input" });
    }
  }

  return AugmentedZodDto as unknown as ZodDto<TSchema> & { io: "input" }
}

function openApiMetadataFactory({
  schema,
  io,
}: {
  schema: UnknownSchema | z3.ZodTypeAny | ($ZodType & { parse: (input: unknown) => unknown; }),
  io: 'input' | 'output',
}) {
  if (!('_zod' in schema) && '_def' in schema && io === 'output') {
    throw new Error('[nestjs-zod] Output schemas are not supported for zod@v3');
  }

  if (!('_zod' in schema) && !('_def' in schema)) {
    return {};
  }

  const generatedJsonSchema = generateJsonSchema(schema, io);
  const { properties = {}, $schema = null, ...jsonSchema } = generatedJsonSchema;

  /**
   * nestjs expects us to return a record of properties
   *
   * However, in some cases, we can't return a record of properties.  For
   * example, arrays, intersections, and unions can not be represented like this
   *
   * As a workaround, we wrap the schema in a object.  Then in the
   * `cleanupOpenApiDoc` function, we unwrap the root object.
   */
  if (!isSchemaWithProperties(generatedJsonSchema)) {
    return {
      [PREFIX]: {
        type: '',
        ...jsonSchema,
      },
    };
  }

  let propertiesMetadata: Record<string, unknown> = {
    [PREFIX]: {
      properties,
      ...jsonSchema,
    }
  };

  // @ts-expect-error TODO: fix this
  for (let [propertyKey, propertySchema] of Object.entries<Record<string, unknown>>(properties || {})) {
    const newPropertySchema: Record<string, unknown> = {
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
      type: '',
      ...propertySchema,
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
    const required = Boolean('required' in jsonSchema && jsonSchema.required?.includes(propertyKey));
    if (newPropertySchema.type === 'object') {
      newPropertySchema.selfRequired = required;
    } else {
      newPropertySchema.required = required;
    }

    propertiesMetadata[propertyKey] = newPropertySchema;
  }

  return propertiesMetadata;
}

function generateJsonSchema(schema: z3.ZodTypeAny | ($ZodType & { parse: (input: unknown) => unknown; }), io: 'input' | 'output') {
  const generatedJsonSchema = '_zod' in schema ? toJSONSchema(schema, {
    io,
    override: ({ jsonSchema }) => {
        if (io === 'output' && 'id' in jsonSchema) {
            jsonSchema.id = `${jsonSchema.id}_Output`;
        }
    }
  }) : zodV3ToOpenAPI(schema)

  const $defs = ('$defs' in generatedJsonSchema && generatedJsonSchema.$defs) ? generatedJsonSchema.$defs : undefined;

  // Ensure the $ref is pointing to the correct schema
  // @ts-expect-error
  const fixRefs = (schema) => {
    if (schema.$ref && schema.$ref.startsWith('#/$defs/')) {
      const defKey = schema.$ref.replace('#/$defs/', '');
      const defId = $defs?.[defKey].id;
      if (defId) {
        schema.$ref = `#/$defs/${defId}`;
      }
    }
    return schema;
  }

  const newSchema = walkJsonSchema(generatedJsonSchema as JSONSchema.JSONSchema, fixRefs, { clone: true});

  // Ensure the key in the $defs object is the same as the id of the schema
  const newDefs: Record<string, JSONSchema.BaseSchema> = {};
  Object.entries($defs || {}).forEach(([defKey, defValue]) => {
    const newDefValue = walkJsonSchema(defValue, fixRefs, { clone: true});

    if (newDefValue.id) {
      const newKey = newDefValue.id || defKey;
      if (newDefs[newKey]) {
        throw new Error(`[nestjs-zod] Duplicate id in $defs: ${newKey}`);
      }
      newDefs[newKey] = newDefValue;
    } else {
      newDefs[defKey] = newDefValue;
    }
  });

  if ($defs) {
    newSchema.$defs = newDefs;
  }

  return newSchema;
}

export function isZodDto(metatype: unknown): metatype is ZodDto<UnknownSchema> {
  return Boolean(metatype && (typeof metatype === 'object' || typeof metatype === 'function') && 'isZodDto' in metatype && metatype.isZodDto);
}

function isSchemaWithProperties(jsonSchema: JSONSchema.BaseSchema): jsonSchema is JSONSchema.BaseSchema & { type: string, required?: string[]; properties?: Record<string, Record<string, unknown>> } {
  return !!jsonSchema.properties && Object.keys(jsonSchema.properties).length > 0;
}
