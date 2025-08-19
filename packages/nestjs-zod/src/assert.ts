export function assert(condition: unknown, message: string = 'Assertion failed'): asserts condition {
    if (!condition) {
        throw new Error(`[nestjs-zod] ${message}`);
    }
}

