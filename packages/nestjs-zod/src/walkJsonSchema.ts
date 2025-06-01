import { type JSONSchema } from 'zod/v4/core';
import deepmerge from 'deepmerge'

export function walkJsonSchema(schema: JSONSchema.Schema, callback: (schema: JSONSchema.Schema) => JSONSchema.Schema, options?: { clone?: boolean }) {
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
    // @ts-expect-error
    schema.items = schema.items.map(item => walkJsonSchema(item, callback));
  }

  // Handle oneOf
  if (schema.oneOf) {
    // @ts-expect-error
    schema.oneOf = schema.oneOf.map(subSchema => walkJsonSchema(subSchema, callback));
  }

  // Handle anyOf  
  if (schema.anyOf) {
    // @ts-expect-error
    schema.anyOf = schema.anyOf.map(subSchema => walkJsonSchema(subSchema, callback));
  }

  // Handle allOf
  if (schema.allOf) {
    // @ts-expect-error
    schema.allOf = schema.allOf.map(subSchema => walkJsonSchema(subSchema, callback));
  }

  if (schema.propertyNames) {
    // @ts-expect-error
    schema.propertyNames = walkJsonSchema(schema.propertyNames, callback);
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