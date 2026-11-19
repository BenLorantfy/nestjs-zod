import { JSONSchema } from 'zod/v4/core';

export function fixAllRefs({
  schema,
  defRenames,
  rootSchemaName,
}: {
  schema: JSONSchema.BaseSchema;
  defRenames?: Record<string, string>;
  rootSchemaName?: string;
}) {
  return walkJsonSchema(
    schema,
    (s) => {
      if (s.$ref) {
        if (s.$ref.startsWith('#/$defs/')) {
          const oldDefName = s.$ref.replace('#/$defs/', '');
          const newDefName = defRenames?.[oldDefName];
          if (newDefName) {
            s.$ref = `#/$defs/${newDefName}`;
          }
        }

        s.$ref = s.$ref.replace('#/$defs/', '#/components/schemas/');

        if (s.$ref === '#') {
          if (!rootSchemaName) {
            throw new Error(
              '[fixAllRefs] rootSchemaName is required when fixing a ref to #',
            );
          }
          s.$ref = `#/components/schemas/${rootSchemaName}`;
        }
      }

      return s;
    },
    {
      clone: true,
    },
  );
}

/**
 * OpenAPI 3.0 has no tuples.  zod v4 documents them with 2020-12
 * `prefixItems` (plus `items` for a rest element, or `items: false`), so we
 * document them as an array of their member types, like the zod v3 converter
 * did.  `minItems`/`maxItems` are kept.
 */
function convertPrefixItems(s: JSONSchema.BaseSchema): JSONSchema.BaseSchema {
  if (!Array.isArray(s.prefixItems)) {
    return s;
  }

  const { prefixItems, items, ...rest } = s;
  const members = (
    items && typeof items === 'object' && !Array.isArray(items)
      ? [...prefixItems, items]
      : prefixItems
  ).map((member) =>
    // Boolean schemas: `true` allows any value, `false` allows none
    typeof member === 'boolean' ? (member ? {} : { not: {} }) : member,
  );

  return {
    ...rest,
    items:
      members.length === 0
        ? {}
        : members.length === 1
          ? members[0]
          : { anyOf: members },
  };
}

/**
 * By default, zod generates openapi schemas that are compatible with OpenAPI
 * 3.1.  But OpenAPI 3.0 supports a weird flavour of JSONSchema they call the
 * "subset superset"
 *
 * This function converts the schema to the OpenAPI 3.0 subset superset format.
 *
 * See more information here:
 * https://www.apimatic.io/blog/2021/09/migrating-to-and-from-openapi-3-1
 */
export function convertToOpenApi3Point0(schema: JSONSchema.BaseSchema) {
  return walkJsonSchema(
    schema,
    (s) => {
      // `id` is not valid in OpenAPI 3.0.  Some generators, like
      // `openapi-generator` fail if they come across unrecognized fields
      if ('id' in s) {
        delete s.id;
      }

      s = convertPrefixItems(s);

      // OpenAPI 3.0 requires `type` to be a single string.  zod >= 4.5 emits
      // unions of bare types as `type: ['string', 'null']`, so we convert
      // `null` to `nullable: true` and any remaining multi-type to `anyOf`
      if (Array.isArray(s.type)) {
        const { type, ...rest } = s;
        const types = type.filter((t) => t !== 'null');
        const hadNull = types.length !== type.length;

        if (types.length === 1) {
          return {
            ...rest,
            type: types[0],
            ...(hadNull && { nullable: true }),
          };
        }

        return {
          ...rest,
          anyOf: types.map((t) => ({ type: t })),
          ...(hadNull && { nullable: true }),
        };
      }

      if (s.anyOf) {
        const nullSchema = s.anyOf.findIndex(
          (subSchema) => subSchema.type === 'null',
        );
        if (nullSchema === -1) {
          return s;
        }

        s.anyOf.splice(nullSchema, 1);

        const { anyOf, ...rest } = s;

        if (anyOf.length === 1) {
          // A nullable tuple is merged into this schema before the walk reaches
          // it, so convert it here
          const sole = convertPrefixItems(anyOf[0]);
          if (sole.$ref && Object.keys(sole).length === 1) {
            return { allOf: [sole], nullable: true, ...rest };
          }

          const enumValues = Array.isArray(sole.enum) ? sole.enum : undefined;
          return {
            ...sole,
            ...rest,
            // We need to add `null` to the `enum` array if it exists and is not
            // already included, otherwise the schema does not allow `null`
            // See: https://github.com/OAI/OpenAPI-Specification/issues/1900
            ...(enumValues &&
              !enumValues.includes(null) && { enum: [...enumValues, null] }),
            nullable: true,
          };
        }

        return {
          ...rest,
          anyOf,
          nullable: true,
        };
      }

      if (typeof s.const !== 'undefined') {
        s.enum = [s.const];
        delete s.const;
      }

      // `propertyNames` is not valid in OpenAPI 3.0
      if ('propertyNames' in s) {
        delete s.propertyNames;
      }

      // In JSON Schema 2020-12, `exclusiveMinimum` and `exclusiveMaximum` are
      // numbers.  In OpenAPI 3.0, they are booleans alongside `minimum`/`maximum`.
      if (typeof s.exclusiveMinimum === 'number') {
        s.minimum = s.exclusiveMinimum;
        s.exclusiveMinimum = true;
      }
      if (typeof s.exclusiveMaximum === 'number') {
        s.maximum = s.exclusiveMaximum;
        s.exclusiveMaximum = true;
      }

      return s;
    },
    {
      clone: true,
    },
  );
}

import { deepClone } from './merge';

export function walkJsonSchema(
  schema: JSONSchema.BaseSchema,
  callback: (schema: JSONSchema.BaseSchema) => JSONSchema.BaseSchema,
  options?: { clone?: boolean },
) {
  // Process the schema with callback
  schema = callback(options?.clone ? deepClone(schema) : schema);

  // Handle object properties
  if (schema.type === 'object' && schema.properties) {
    for (const key in schema.properties) {
      // @ts-expect-error FIXME
      schema.properties[key] = walkJsonSchema(schema.properties[key], callback);
    }
  }

  // Handle array items
  if (schema.type === 'array' && Array.isArray(schema.items)) {
    // @ts-expect-error FIXME
    schema.items = schema.items.map((item) => walkJsonSchema(item, callback));
  }

  if (schema.type === 'array' && schema.items) {
    // @ts-expect-error FIXME
    schema.items = walkJsonSchema(schema.items, callback);
  }

  // Handle tuple members
  if (schema.type === 'array' && Array.isArray(schema.prefixItems)) {
    schema.prefixItems = schema.prefixItems.map((item) =>
      typeof item === 'boolean' ? item : walkJsonSchema(item, callback),
    );
  }

  // Handle oneOf
  if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map((subSchema) =>
      walkJsonSchema(subSchema, callback),
    );
  }

  // Handle anyOf
  if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map((subSchema) =>
      walkJsonSchema(subSchema, callback),
    );
  }

  // Handle allOf
  if (schema.allOf) {
    schema.allOf = schema.allOf.map((subSchema) =>
      walkJsonSchema(subSchema, callback),
    );
  }

  if (typeof schema.additionalProperties === 'object') {
    schema.additionalProperties = walkJsonSchema(
      schema.additionalProperties,
      callback,
    );
  }

  if (
    typeof schema.propertyNames === 'object' &&
    schema.propertyNames !== null
  ) {
    (schema as Record<string, unknown>).propertyNames = walkJsonSchema(
      schema.propertyNames as JSONSchema.BaseSchema,
      callback,
    );
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
