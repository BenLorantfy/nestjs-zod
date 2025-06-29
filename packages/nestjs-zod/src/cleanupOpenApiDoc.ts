import type { OpenAPIObject } from '@nestjs/swagger';
import deepmerge from 'deepmerge';
import { ioSymbol, schemaSymbol } from './dto';
import { $ZodType, globalRegistry, JSONSchema, toJSONSchema } from 'zod/v4/core';
import { assert } from './assert';
import { fixAllRefs } from './utils';
import { DEFS_KEY, EMPTY_TYPE_KEY, PARENT_ID_KEY, PREFIX } from './const';

type DtoSchema = Exclude<Exclude<OpenAPIObject['components'], undefined>['schemas'], undefined>[string];

export function cleanupOpenApiDoc(doc: OpenAPIObject): OpenAPIObject {
    const schemas: Record<string, DtoSchema> = {};
    const renames: Record<string, string> = {};

    console.log('old schemas', JSON.stringify(doc.components?.schemas, null, '\t'))

    for (let [oldSchemaName, oldOpenapiSchema] of Object.entries(doc.components?.schemas || {})) {
        // Ignore non-object types, which are not added by us
        if (!('type' in oldOpenapiSchema) || oldOpenapiSchema.type !== 'object') {
            continue;
        }

        // Assume the new schema name is the same for now.  However, in the
        // property loop we might change the schema name
        let newSchemaName = oldSchemaName;

        // Clone so we can mutate
        const newOpenapiSchema = deepmerge<typeof oldOpenapiSchema>({}, oldOpenapiSchema);

        let addedDefs = false;
        for (let propertySchema of Object.values(newOpenapiSchema.properties || {})) {
            // Remove `type` if we added `type: ''`
            if ('type' in propertySchema && propertySchema.type === '' && EMPTY_TYPE_KEY in propertySchema && propertySchema[EMPTY_TYPE_KEY]) {
                delete propertySchema.type;
                delete propertySchema[EMPTY_TYPE_KEY];
            }

            // Add each $def as a schema
            if (DEFS_KEY in propertySchema) {
                const defs = propertySchema[DEFS_KEY] as Record<string, JSONSchema.BaseSchema>;
                delete propertySchema[DEFS_KEY];

                if (!addedDefs) {
                    for (let [defSchemaId, defSchema] of Object.entries(defs)) {
                        // TODO: what if defSchemaId is same as this schema's ID?
                        // TODO: check if schema already exists in schemas

                        schemas[defSchemaId] = fixAllRefs(defSchema);
                    }

                    addedDefs = true;
                }
            }

            // Rename the schema if using `meta({ id: "NewName" })`
            if (PARENT_ID_KEY in propertySchema && typeof propertySchema[PARENT_ID_KEY] === 'string') {
                newSchemaName = propertySchema[PARENT_ID_KEY]
            }
        }






        if (newSchemaName !== oldSchemaName) {
            renames[oldSchemaName] = newSchemaName;

            // @ts-expect-error TODO: is ID a valid openapi field?
            newOpenapiSchema['id'] = newSchemaName;
        }
        
        // @ts-expect-error TODO: fix TS error
        schemas[newSchemaName] = fixAllRefs(newOpenapiSchema);


        
        // console.log('oldOpenapiSchema', oldOpenapiSchema);
        // TOOD: skip schemas that have already been added?

        // const { io, schema } = getDtoInfo(oldOpenapiSchema);
        // if (!io || !schema) {
        //     if (schemas[oldSchemaName]) {
        //         throw new Error(`Schema ${oldSchemaName} has already been added`);
        //     }
        //     schemas[oldSchemaName] = oldOpenapiSchema;
        //     continue;
        // }
        
        // const meta = globalRegistry.get(schema);
        // const newSchemaName = io === 'output' ? (meta?.id ? `${meta.id}_Output` : oldSchemaName) : meta?.id || oldSchemaName;
        // const newSchema = toJSONSchema(schema, {
        //     io, 
        //     override: ({ jsonSchema }) => {
        //         if (io === 'output' && 'id' in jsonSchema) {
        //             jsonSchema.id = `${jsonSchema.id}_Output`;
        //         }
        //     } 
        // });

        // for (let [key, value] of Object.entries(newSchema.$defs || {})) {
        //     // TODO: what to do if the new schema name is already taken?
        //     schemas[key] = fixAllRefs({
        //         '$schema': newSchema['$schema'],
        //         ...value,
        //     })
        // }

        // delete newSchema.$defs;

        // // TODO: what to do if the new schema name is already taken?
        // schemas[newSchemaName] = fixAllRefs(newSchema);
        // if (newSchemaName !== oldSchemaName) {
        //     renames[oldSchemaName] = newSchemaName;
        // }
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

function getDtoInfo(oldOpenapiSchema: DtoSchema) {
    if ('type' in oldOpenapiSchema && oldOpenapiSchema.type === 'object') {
        const ioProperty: unknown = oldOpenapiSchema.properties?.['__nestjs_zod_io'] || {};
        const io = ioProperty && typeof ioProperty === 'object' && 'x-io' in ioProperty ? ioProperty['x-io'] : 'input';
        assert(io === 'input' as const || io === 'output' as const, 'Invalid io');

        const schemaProperty: unknown = oldOpenapiSchema.properties?.['__nestjs_zod_schema'] || {};
        const schema = schemaProperty && typeof schemaProperty === 'object' && 'x-schema' in schemaProperty ? schemaProperty['x-schema'] : undefined;

        return {
            io,
            schema: schema as $ZodType|undefined,
        }
    }

    return {
        io: undefined,
        schema: undefined
    }
}

function getSchemaNameFromRef(ref: string) {
    const lastSlash = ref.lastIndexOf("/");
    const schemaName = ref.slice(lastSlash + 1);
    return schemaName;
}
