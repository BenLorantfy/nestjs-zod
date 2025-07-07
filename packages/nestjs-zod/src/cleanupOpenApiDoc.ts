import type { OpenAPIObject } from '@nestjs/swagger';
import deepmerge from 'deepmerge';
import { JSONSchema } from 'zod/v4/core';
import { fixAllRefs } from './utils';
import { DEFS_KEY, EMPTY_TYPE_KEY, PARENT_ID_KEY } from './const';
import { isDeepStrictEqual } from 'node:util';

type DtoSchema = Exclude<Exclude<OpenAPIObject['components'], undefined>['schemas'], undefined>[string];

export function cleanupOpenApiDoc(doc: OpenAPIObject): OpenAPIObject {
    const schemas: Record<string, DtoSchema> = {};
    const renames: Record<string, string> = {};

    for (let [oldSchemaName, oldOpenapiSchema] of Object.entries(doc.components?.schemas || {})) {
        // Ignore non-object types, which are not added by us
        if (!('type' in oldOpenapiSchema) || oldOpenapiSchema.type !== 'object') {
            continue;
        }

        let newSchemaName = oldSchemaName;
        let addedDefs = false;

        // Clone so we can mutate
        let newOpenapiSchema = deepmerge<typeof oldOpenapiSchema>({}, oldOpenapiSchema);

        for (let propertySchema of Object.values(newOpenapiSchema.properties || {})) {
            // Remove `type` if we added `type: ''`
            if (EMPTY_TYPE_KEY in propertySchema && propertySchema[EMPTY_TYPE_KEY] && 'type' in propertySchema && propertySchema.type === '') {
                delete propertySchema.type;
                delete propertySchema[EMPTY_TYPE_KEY];
            }

            // Rename the schema if using `meta({ id: "NewName" })`
            if (PARENT_ID_KEY in propertySchema && typeof propertySchema[PARENT_ID_KEY] === 'string') {
                newSchemaName = propertySchema[PARENT_ID_KEY];
                delete propertySchema[PARENT_ID_KEY];
            }

            // Add each $def as a schema
            if (DEFS_KEY in propertySchema) {
                const defs = propertySchema[DEFS_KEY] as Record<string, JSONSchema.BaseSchema>;
                delete propertySchema[DEFS_KEY];

                if (!addedDefs) {
                    for (let [defSchemaId, defSchema] of Object.entries(defs)) {
                        // TODO: what if defSchemaId is same as this schema's ID?
                        // TODO: check if schema already exists in schemas

                        const fixedDef = fixAllRefs({ schema: defSchema, rootSchemaName: newSchemaName });

                        if (schemas[defSchemaId] && !isDeepStrictEqual(schemas[defSchemaId], fixedDef)) {
                            throw new Error(`[cleanupOpenApiDoc] Found multiple schemas with name \`${defSchemaId}\`.  Please review your schemas to ensure that you are not using the same schema name for different schemas`);
                        }

                        // @ts-ignore TODO: fix this
                        schemas[defSchemaId] = fixedDef;
                    }

                    addedDefs = true;
                }
            }
        }

        if (newSchemaName !== oldSchemaName) {
            renames[oldSchemaName] = newSchemaName;

            // @ts-expect-error TODO: is ID a valid openapi field?
            newOpenapiSchema['id'] = newSchemaName;
        }

        // TODO: remove hard-coded true
        if (true) {
            newOpenapiSchema = fixAllRefs({
                // @ts-expect-error TODO: fix TS error
                schema: newOpenapiSchema,
                rootSchemaName: newSchemaName,
            });
        }

        if (schemas[newSchemaName] && !isDeepStrictEqual(schemas[newSchemaName], newOpenapiSchema)) {
            throw new Error(`[cleanupOpenApiDoc] Found multiple schemas with name \`${newSchemaName}\`.  Please review your schemas to ensure that you are not using the same schema name for different schemas`);
        }
        
        schemas[newSchemaName] = newOpenapiSchema;
    }

    // Rename all the references for 
    const paths = deepmerge<typeof doc.paths>(doc.paths, {})
    for (let { get, patch, post, delete: del, put, head } of Object.values(paths)) {
        for (let methodObject of Object.values({ get, patch, post, del, put, head })) {
            const content = methodObject?.requestBody && 'content' in methodObject?.requestBody && methodObject?.requestBody.content || {}
            for (let requestBodyObject of Object.values(content)) {
                if (requestBodyObject.schema && '$ref' in requestBodyObject.schema) {
                    const oldSchemaName = getSchemaNameFromRef(requestBodyObject.schema.$ref);
                    if (renames[oldSchemaName]) {
                        const newSchemaName = renames[oldSchemaName];
                        requestBodyObject.schema.$ref = requestBodyObject.schema.$ref.replace(`/${oldSchemaName}`, `/${newSchemaName}`);
                    }
                }
            }

            for (let statusCodeObject of Object.values(methodObject?.responses || {})) {
                const content = statusCodeObject && 'content' in statusCodeObject && statusCodeObject.content || {};
                for (let responseBodyObject of Object.values(content)) {
                    if (responseBodyObject.schema && '$ref' in responseBodyObject.schema) {
                        const oldSchemaName = getSchemaNameFromRef(responseBodyObject.schema.$ref);
                        if (renames[oldSchemaName]) {
                            const newSchemaName = renames[oldSchemaName];
                            responseBodyObject.schema.$ref = responseBodyObject.schema.$ref.replace(`/${oldSchemaName}`, `/${newSchemaName}`);
                        }
                    }
                }
            }

            for (let parameter of methodObject?.parameters || []) {
                // I don't fully understand why nestjs is moving this property
                // out of schema and into the root level of the parameter object 🤷
                if (EMPTY_TYPE_KEY in parameter) {
                    delete parameter[EMPTY_TYPE_KEY];
                    if ('schema' in parameter && parameter.schema && 'type' in parameter.schema) {
                        delete parameter.schema.type;
                    }
                }

                // Add each $def as a schema
                if (DEFS_KEY in parameter) {
                    const defs = parameter[DEFS_KEY] as Record<string, JSONSchema.BaseSchema>;
                    delete parameter[DEFS_KEY];

                    for (let [defSchemaId, defSchema] of Object.entries(defs)) {                        
                        let fixedDef;
                        try {
                            fixedDef = fixAllRefs({ schema: defSchema });
                        } catch (err) {
                            if (err instanceof Error && err.message.startsWith('[fixAllRefs]')) {
                                throw new Error(`[cleanupOpenApiDoc] Recursive schemas are not supported for parameters`, { cause: err });
                            }
                            throw err;
                        }

                        if (schemas[defSchemaId] && !isDeepStrictEqual(schemas[defSchemaId], fixedDef)) {
                            throw new Error(`[cleanupOpenApiDoc] Found multiple schemas with name \`${defSchemaId}\`.  Please review your schemas to ensure that you are not using the same schema name for different schemas`);
                        }

                        // @ts-ignore TODO: fix this
                        schemas[defSchemaId] = fixedDef;
                    }

                }

                // TODO: don't do this to non-zod dtos
                if ('schema' in parameter) {
                    try {
                        // @ts-expect-error TODO: fix this
                        parameter.schema = fixAllRefs({ schema: parameter.schema });
                    } catch (err) {
                        if (err instanceof Error && err.message.startsWith('[fixAllRefs]')) {
                            throw new Error(`[cleanupOpenApiDoc] Recursive schemas are not supported for parameters`, { cause: err });
                        }
                        throw err;
                    }
                }

                if (PARENT_ID_KEY in parameter) {
                    delete parameter[PARENT_ID_KEY];
                }
            }
        }
    }

    return {
        ...doc,
        paths,
        components: {
            ...doc.components,
            schemas,
        }
    }
}

function getSchemaNameFromRef(ref: string) {
    const lastSlash = ref.lastIndexOf("/");
    const schemaName = ref.slice(lastSlash + 1);
    return schemaName;
}
