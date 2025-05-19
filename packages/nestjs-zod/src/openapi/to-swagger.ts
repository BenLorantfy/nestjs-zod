import type * as z3 from 'zod/v3';
import { toJSONSchema, type $ZodType } from 'zod/v4/core';
import { type ExtendedSchemaObject, zodToOpenAPI } from './zod-to-openapi';

/**
 * Convert a zod schema to a swagger schema.  Converts to JSONSchema and then
 * tweaks the schema to work well with swagger, which has some quirks.
 */
export function toSwagger(schema: { parse: (data: unknown) => unknown }|z3.ZodTypeAny|$ZodType): ExtendedSchemaObject {
    if ('_zod' in schema) {
        return toJSONSchema(schema, {
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
        })
    }

    if ('_def' in schema) {
        return zodToOpenAPI(schema)
    }

    return {};
}