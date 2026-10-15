/**
 * `nestjs-zod` passes fields set with `.meta()` through to the generated
 * OpenAPI document.  zod's `GlobalMeta` type only declares JSON Schema fields
 * (`id`, `title`, `description`, `deprecated`), so here we also declare the
 * OpenAPI-specific `example` field, so that it shows up in autocomplete
 *
 * @see https://zod.dev/metadata#global-registry
 */
declare module 'zod/v4/core' {
  interface GlobalMeta {
    /**
     * An example value for this schema.  Displayed in the OpenAPI document
     * (and in SwaggerUI)
     *
     * @example
     * z.string().meta({ example: 'John Doe' })
     */
    example?: unknown;
  }
}

export {};
