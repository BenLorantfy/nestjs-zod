import type { OpenAPIObject } from '@nestjs/swagger';
import { walkJsonSchema } from './walkJsonSchema';
import { toJSONSchema, globalRegistry, JSONSchema } from 'zod/v4/core';
import deepmerge from 'deepmerge';

type DtoSchema = Exclude<Exclude<OpenAPIObject['components'], undefined>['schemas'], undefined>[string];

export function cleanupOpenApiDoc(d: OpenAPIObject): OpenAPIObject {
    const doc = deepmerge<typeof d>(d, {});

    // TODO: 
    // - If a createZodDto() is called with a zod schema that uses `meta`, then we should rename the component to match the meta.id
    // - Change `x-zod-ref` to `$ref` 
    // - Add all the zod components to the components section

    // TODO: consider both input and output
    // TODO: Only add compnents that are used

    let foundSchemaIds = new Set<string>();

    const dtoSchemas = {};
    const dtoRenames: Record<string, string> = {};

    for (let [key, value] of Object.entries(doc.components?.schemas || {})) {
        const schemaId = getSchemaIdFromDtoSchema(value) || key;
        if (schemaId !== key) {
            dtoRenames[key] = schemaId;
        }

        // @ts-expect-error
        dtoSchemas[schemaId] = walkJsonSchema(value, (schema) => {
            if (schema['x-__nestjs-zod__-ref']) {
                // @ts-expect-error
                let schemaRefId: string = schema['x-__nestjs-zod__-ref'].replace('#/$defs/', '');
                if (dtoRenames[schemaRefId]) {
                    schemaRefId = dtoRenames[schemaRefId];
                }

                foundSchemaIds.add(schemaRefId);
                schema.$ref = `#/components/schemas/${schemaRefId}`;
                delete schema['x-__nestjs-zod__-ref'];
                // @ts-expect-error
                delete schema['type'];
            }

            if (schema['x-__nestjs_zod__-anyOf']) {
                // @ts-expect-error
                delete schema['type'];
                
                // @ts-expect-error
                schema.anyOf = schema['x-__nestjs_zod__-anyOf'];
                
                delete schema['x-__nestjs_zod__-anyOf'];
            }

            if (schema['x-__nestjs_zod__-allOf']) {
                // @ts-expect-error
                delete schema['type'];

                // @ts-expect-error
                schema.allOf = schema['x-__nestjs_zod__-allOf'];

                delete schema['x-__nestjs_zod__-allOf'];
            }

            if (schema['x-__nestjs_zod__-const']) {
                // @ts-expect-error
                delete schema['type'];

                // @ts-expect-error
                schema.const = schema['x-__nestjs_zod__-const'];
                delete schema['x-__nestjs_zod__-const'];
            }

            return schema;
        }, { clone: true });
    }

    const zodRegistrySchemas = toJSONSchema(globalRegistry, {
        io: 'input',
    })

    const foundSchemas: { schemas: Record<string, JSONSchema.BaseSchema> } = { schemas: {} }

    for (let schemaId of foundSchemaIds) {
        // @ts-expect-error
        const newSchema = walkJsonSchema(zodRegistrySchemas.schemas[schemaId], (schema) => {
            if (schema.$ref?.startsWith('#/$defs/')) {
                // TODO: make sure this is right
                schema.$ref = schema.$ref.replace('#/$defs/', '#/components/schemas/');
                foundSchemaIds.add(schema.$ref.replace('#/$defs/', ''));
            }
            return schema;
        }, { clone: true });

        if (!foundSchemas.schemas[schemaId]) {
            foundSchemas.schemas[schemaId] = newSchema;
        }
    }

    for (let [path, value] of Object.entries(doc.paths)) {
        for (let method of ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const) {
            // Rename the `$ref` in the requestBody 
            const operationObject = value[method];
            if (operationObject?.requestBody && 'content' in operationObject.requestBody) {
                for (let [contentType, value] of Object.entries(operationObject?.requestBody?.content)) {
                    const schema = value.schema;
                    if (schema) {
                        if ('$ref' in schema) {
                            const id = schema.$ref.replace('#/components/schemas/', '');
                            if (dtoRenames[id]) {
                                schema.$ref = `#/components/schemas/${dtoRenames[id]}`;
                            }
                        }

                        if ('type' in schema && schema.type === 'array' && schema.items && '$ref' in schema.items) {
                            const id = schema.items.$ref.replace('#/components/schemas/', '');
                            if (dtoRenames[id]) {
                                schema.items.$ref = `#/components/schemas/${dtoRenames[id]}`;
                            }
                        }
                    }

                }
            }

            // Rename the `$ref` in the responses
            if (operationObject?.responses) {
                for (let [statusCode, value] of Object.entries(operationObject?.responses)) {
                    if (value && 'content' in value && value.content) {
                        for (let [contentType, contentTypeValue] of Object.entries(value.content)) {
                            const schema = contentTypeValue.schema;
                            if (schema) {
                                if ('$ref' in schema) {
                                    const id = schema.$ref.replace('#/components/schemas/', '');
                                    if (dtoRenames[id]) {
                                        schema.$ref = `#/components/schemas/${dtoRenames[id]}`;
                                    }
                                }

                                if ('type' in schema && schema.type === 'array' && schema.items && '$ref' in schema.items) {
                                    const id = schema.items.$ref.replace('#/components/schemas/', '');
                                    if (dtoRenames[id]) {
                                        schema.items.$ref = `#/components/schemas/${dtoRenames[id]}`;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Remove x-__nestjs-zod__parent-schema-id from parameters
            if (operationObject?.parameters) {
                for (let [paramName, paramValue] of Object.entries(operationObject?.parameters)) {
                    if (paramValue && 'x-__nestjs-zod__parent-schema-id' in paramValue) {
                        delete paramValue['x-__nestjs-zod__parent-schema-id'];
                    }
                }
            }
        }
    }


    return {
        ...doc,
        components: {
            ...doc.components,
            schemas: {
                ...dtoSchemas,
                ...foundSchemas.schemas, // TODO: throw error if we over-ride exisitng schemas?
            }
        }
    }
}

function getSchemaIdFromDtoSchema(dtoSchema: DtoSchema) {
    let schemaId: string | undefined;
    if ('properties' in dtoSchema) {
        const properties = dtoSchema.properties || {};
        for (let value of Object.values(properties)) {
            if('x-__nestjs-zod__parent-schema-id' in value && typeof value['x-__nestjs-zod__parent-schema-id'] === 'string') {
                schemaId = value['x-__nestjs-zod__parent-schema-id'];
                delete value['x-__nestjs-zod__parent-schema-id'];
            }
        }
    }
    
    return schemaId;
}