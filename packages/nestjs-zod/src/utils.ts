import { JSONSchema } from "zod/v4/core";

export function fixAllRefs({ schema, defRenames, rootSchemaName }: { schema: JSONSchema.BaseSchema, defRenames?: Record<string, string>, rootSchemaName?: string }) {
    return walkJsonSchema(schema, (s) => {
        if (s.$ref) {
          if (s.$ref.startsWith('#/$defs/')) {
            let oldDefName = s.$ref.replace('#/$defs/', '');

            if (oldDefName.endsWith('_Output')) {
              const newDefName = defRenames?.[oldDefName] || oldDefName;
              s.$ref = `#/$defs/${newDefName}`;
            } else {
              const newDefName = defRenames?.[oldDefName] || `${oldDefName}_Output`;
              s.$ref = `#/$defs/${newDefName}`;
            }
          }


            s.$ref = s.$ref.replace('#/$defs/', '#/components/schemas/');


            
            if (s.$ref === '#') {
              if (!rootSchemaName) {
                throw new Error('[fixAllRefs] rootSchemaName is required when fixing a ref to #');
              }
              s.$ref = `#/components/schemas/${rootSchemaName}`;
            }
        }

        return s;
    }, { 
        clone: true
    })
}

export function fixNull(schema: JSONSchema.BaseSchema) {
  return walkJsonSchema(schema, (s) => {
    if (Object.keys(s).length === 1 && s.anyOf) {
      const nullSchema = s.anyOf.findIndex(subSchema => subSchema.type === 'null');
      if (nullSchema === -1) {
        return s;
      }

      s.anyOf.splice(nullSchema, 1);

      if (s.anyOf.length === 1) {
        return {
          ...s.anyOf[0],
          nullable: true,
        }
      }

      return {
        anyOf: s.anyOf.map(subSchema => ({
          ...subSchema,
          nullable: true,
        })),
      }
    }


    return s;
  }, {
    clone: true
  });
}

import deepmerge from 'deepmerge'

export function walkJsonSchema(schema: JSONSchema.BaseSchema, callback: (schema: JSONSchema.BaseSchema) => JSONSchema.BaseSchema, options?: { clone?: boolean }) {
  // Process the schema with callback
  schema = callback(options?.clone ? deepmerge<typeof schema>(schema, {}) : schema);

  // Handle object properties
  if (schema.type === 'object' && schema.properties) {
    for (const key in schema.properties) {
    // @ts-expect-error
      schema.properties[key] = walkJsonSchema(schema.properties[key], callback);
    }
  }

  // Handle array items
  if (schema.type === 'array' && Array.isArray(schema.items)) {
    // @ts-ignore
    schema.items = schema.items.map(item => walkJsonSchema(item, callback));
  }

  if (schema.type === 'array' && schema.items) {
    // @ts-expect-error
    schema.items = walkJsonSchema(schema.items, callback);
  }

  // Handle oneOf
  if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map(subSchema => walkJsonSchema(subSchema, callback));
  }

  // Handle anyOf  
  if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map(subSchema => walkJsonSchema(subSchema, callback));
  }

  // Handle allOf
  if (schema.allOf) {
    schema.allOf = schema.allOf.map(subSchema => walkJsonSchema(subSchema, callback));
  }

  if (typeof schema.additionalProperties === 'object') {
    schema.additionalProperties = walkJsonSchema(schema.additionalProperties, callback);
  }

//   // Handle not
//   if (schema.not) {
//     schema.not = walkJsonSchema(schema.not, callback);
//   }

//   // Handle if/then/else
//   if (schema.if) {
//     schema.if = walkJsonSchema(schema.if, callback);
//   }
//   if (schema.then) {
//     schema.then = walkJsonSchema(schema.then, callback);
//   }
//   if (schema.else) {
//     schema.else = walkJsonSchema(schema.else, callback);
//   }

  return schema;
}