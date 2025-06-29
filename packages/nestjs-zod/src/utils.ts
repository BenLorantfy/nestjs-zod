import { JSONSchema } from "zod/v4/core";

export function fixAllRefs(schema: JSONSchema.BaseSchema) {
    return walkJsonSchema(schema, (s) => {
        if (s.$ref) {
            s.$ref = s.$ref.replace('#/$defs/', '#/components/schemas/');
        }

        return s;
    }, { 
        clone: true
    })
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