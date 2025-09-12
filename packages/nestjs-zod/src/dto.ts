import { UnknownSchema } from './types'
import type * as z3 from 'zod/v3';
import { toJSONSchema, $ZodType, JSONSchema } from "zod/v4/core";
import { assert } from './assert';
import { DEFS_KEY, EMPTY_TYPE_KEY, HAS_CONST_KEY, HAS_NULL_KEY, PARENT_ADDITIONAL_PROPERTIES_KEY, PARENT_HAS_REFS_KEY, PARENT_ID_KEY, PREFIX, UNWRAP_ROOT_KEY } from './const';
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

  const { $defs, $schema, ...generatedJsonSchema } = generateJsonSchema(schema, io);

  /**
   * nestjs expects us to return a record of properties
   *
   * However, in some cases, we can't return a record of properties.  For
   * example, arrays, intersections, and unions can not be represented like this
   *
   * As a workaround, we wrap the schema in a "root" object.  Then in the
   * `cleanupOpenApiDoc` function, we unwrap the root object.
   */
  const jsonSchema: JSONSchema.JSONSchema & {
    type: "object";
    required?: string[];
    properties?: Record<string, Record<string, unknown>>;
  } = !isObjectTypeWithProperties(generatedJsonSchema) ? {
    type: 'object' as const, 
    properties: { 
      root: {
        ...generatedJsonSchema,
        [UNWRAP_ROOT_KEY]: true
      }
    },
    $defs,
  } : {
    ...generatedJsonSchema,
    $defs,
  };
  
  const { hasRefs, hasNull, hasConst } = getSchemaMetadata(jsonSchema);

  let properties: Record<string, unknown> = {};
  for (let [propertyKey, propertySchema] of Object.entries(jsonSchema.properties || {})) {
    const newPropertySchema: Record<string, unknown> = {
      // TODO: figure out why this fails at compile time
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

    if (hasConst) {
      newPropertySchema[HAS_CONST_KEY] = true;
    }

    if (hasNull) {
      newPropertySchema[HAS_NULL_KEY] = true;
    }

    if (hasRefs) {
      newPropertySchema[PARENT_HAS_REFS_KEY] = true;
    }

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

    if (typeof jsonSchema.additionalProperties === 'boolean') {
      newPropertySchema[PARENT_ADDITIONAL_PROPERTIES_KEY] = jsonSchema.additionalProperties;
    }

    properties[propertyKey] = newPropertySchema;
  }

  return properties;
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
  const newSchema = walkJsonSchema(generatedJsonSchema, (schema) => {
    if (schema.$ref && schema.$ref.startsWith('#/$defs/')) {
      const defKey = schema.$ref.replace('#/$defs/', '');
      const defId = $defs?.[defKey].id;
      if (defId) {
        schema.$ref = `#/$defs/${defId}`;
      }

    }
    return schema;
  }, { clone: true});

  // Ensure the key in the $defs object is the same as the id of the schema
  const newDefs: Record<string, JSONSchema.BaseSchema> = {};
  Object.entries($defs || {}).forEach(([defKey, defValue]) => {
    if (defValue.id) {
      const newKey = defValue.id || defKey;
      if (newDefs[newKey]) {
        throw new Error(`[nestjs-zod] Duplicate id in $defs: ${newKey}`);
      }
      newDefs[newKey] = defValue;
    } else {
      newDefs[defKey] = defValue;
    }
  });

  if ($defs) {
    newSchema.$defs = newDefs;
  }

  return newSchema;
}

function getSchemaMetadata(jsonSchema: JSONSchema.BaseSchema) {
  let hasRefs = false;
  let hasNull = false;
  let hasConst = false;
  walkJsonSchema(jsonSchema, (schema) => {
    if (schema.type === 'null') {
      hasNull = true;
    }
    if (schema.$ref) {
      hasRefs = true;
    }
    if (schema.const) {
      hasConst = true;
    }
    return schema;
  });

  return {
    hasRefs,
    hasNull,
    hasConst,
  }
}

export function isZodDto(metatype: unknown): metatype is ZodDto<UnknownSchema> {
  return Boolean(metatype && (typeof metatype === 'object' || typeof metatype === 'function') && 'isZodDto' in metatype && metatype.isZodDto);
}

function isObjectTypeWithProperties(jsonSchema: JSONSchema.BaseSchema): jsonSchema is JSONSchema.BaseSchema & { type: 'object', required?: string[]; properties?: Record<string, Record<string, unknown>> } {
  return jsonSchema.type === 'object' && !!jsonSchema.properties && Object.keys(jsonSchema.properties).length > 0;
}
