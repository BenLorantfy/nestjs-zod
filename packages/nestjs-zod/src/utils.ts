import { JSONSchema } from "zod/v4/core";

export function fixAllRefs({ schema, defRenames, rootSchemaName }: { schema: JSONSchema.BaseSchema, defRenames?: Record<string, string>, rootSchemaName?: string }) {
    return walkJsonSchema(schema, (s) => {
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

    if (s.const) {
      s.enum = [s.const];
      delete s.const;
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



import * as z from "zod/v4";

type MapTuple<T extends readonly unknown[]> = {
  [K in keyof T]: T[K] extends z.ZodTypeAny ? StripDefaultsDeep<T[K]> : T[K];
};

export type StripDefaultsDeep<S extends z.ZodTypeAny> =
// unwrap defaults (and prefaults if you want)
  S extends z.ZodDefault<infer I> ? StripDefaultsDeep<I> :
    S extends z.ZodPrefault<infer I> ? StripDefaultsDeep<I> :

      // recurse through common containers/wrappers
      S extends z.ZodOptional<infer I> ? z.ZodOptional<StripDefaultsDeep<I>> :
        S extends z.ZodNullable<infer I> ? z.ZodNullable<StripDefaultsDeep<I>> :
          S extends z.ZodArray<infer I> ? z.ZodArray<StripDefaultsDeep<I>> :
            S extends z.ZodTuple<infer Items, infer Rest>
              ? z.ZodTuple<MapTuple<Items>, Rest extends z.ZodTypeAny ? StripDefaultsDeep<Rest> : Rest> :
              S extends z.ZodUnion<infer Options extends readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]>
                ? z.ZodUnion<MapTuple<Options> extends any ? MapTuple<Options> : Options> :
                S extends z.ZodIntersection<infer L, infer R>
                  ? z.ZodIntersection<StripDefaultsDeep<L>, StripDefaultsDeep<R>> :
                  S extends z.ZodObject<infer Shape extends z.ZodRawShape, infer UnknownKeys, infer Catchall>
                    ? z.ZodObject<{ [K in keyof Shape]: StripDefaultsDeep<Shape[K]> }, UnknownKeys, StripDefaultsDeep<Catchall>> :
                    S extends z.ZodRecord<infer K, infer V> ? z.ZodRecord<StripDefaultsDeep<K>, StripDefaultsDeep<V>> :
                      S extends z.ZodMap<infer K, infer V> ? z.ZodMap<StripDefaultsDeep<K>, StripDefaultsDeep<V>> :
                        S extends z.ZodSet<infer V> ? z.ZodSet<StripDefaultsDeep<V>> :
                          S extends z.ZodPromise<infer V> ? z.ZodPromise<StripDefaultsDeep<V>> :

                            // fallback
                            S;

type AnySchema = z.ZodTypeAny;

type DeepRemoveDefaultsOptions = {
  stripPrefaults?: boolean;
};

export function deepRemoveDefaults<T extends AnySchema>(
  schema: T,
  opts: DeepRemoveDefaultsOptions = {},
): StripDefaultsDeep<T> {
  const memo = new Map<AnySchema, AnySchema>();

  const isSchema = (v: unknown): v is AnySchema =>
    typeof v === "object" &&
    v !== null &&
    "_zod" in (v as any) &&
    (v as any)._zod?.def &&
    typeof (v as any)._zod.def.type === "string";

  const isPlainObject = (v: unknown): v is Record<string | symbol, unknown> => {
    if (typeof v !== "object" || v === null) return false;
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
  };

  const firstChildSchema = (def: any): AnySchema | undefined => {
    const descs = Object.getOwnPropertyDescriptors(def);
    for (const d of Object.values(descs)) {
      if ("value" in d && isSchema(d.value)) return d.value;
    }
    return undefined;
  };

  const cloneValue = (value: any): any => {
    if (isSchema(value)) return strip(value);
    if (Array.isArray(value)) return value.map(cloneValue);

    if (isPlainObject(value)) {
      const out: any = {};
      const descs = Object.getOwnPropertyDescriptors(value);

      for (const [key, desc] of Object.entries(descs)) {
        if ("value" in desc) {
          Object.defineProperty(out, key, { ...desc, value: cloneValue(desc.value) });
        } else if (desc.get) {
          const origGet = desc.get;
          let cached = false;
          let cachedVal: unknown;
          Object.defineProperty(out, key, {
            ...desc,
            get() {
              if (cached) return cachedVal;
              const res = origGet.call(this);
              cachedVal = cloneValue(res);
              cached = true;
              return cachedVal;
            },
          });
        } else {
          Object.defineProperty(out, key, desc);
        }
      }

      for (const sym of Object.getOwnPropertySymbols(value)) {
        const desc = Object.getOwnPropertyDescriptor(value, sym);
        if (!desc) continue;
        if ("value" in desc) {
          Object.defineProperty(out, sym, { ...desc, value: cloneValue(desc.value) });
        } else {
          Object.defineProperty(out, sym, desc);
        }
      }

      return out;
    }

    return value;
  };

  const strip = (s: AnySchema): AnySchema => {
    const existing = memo.get(s);
    if (existing) return existing;

    const def = (s as any)._zod?.def;
    const type = def?.type;

    if (type === "default" || (opts.stripPrefaults && type === "prefault")) {
      const inner = firstChildSchema(def);
      return inner ? strip(inner) : s;
    }

    const newDef = cloneValue(def);
    const Ctor = (s as any).constructor as new (d: any) => AnySchema;
    const rebuilt = new Ctor(newDef);

    memo.set(s, rebuilt);
    return rebuilt;
  };

  return strip(schema) as unknown as StripDefaultsDeep<T>;
}