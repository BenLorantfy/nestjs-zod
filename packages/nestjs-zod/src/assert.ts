export function assert(condition: boolean, message: string = 'Assertion failed'): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

