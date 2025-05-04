/**
 * Here we define our own minimal type for ZodSchema, so we don't need to depend
 * on zod directly.  This de-couples us from zod and allows users to bring any
 * version of zod they want 
 */
export interface ZodSchema<TOutput> {
    parse(input: unknown): TOutput,
    safeParse(input: unknown): { success: true, data: TOutput } | { success: false, error: { errors: unknown[] } }
}
