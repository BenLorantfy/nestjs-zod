import { fixAllRefs, walkJsonSchema } from "./utils";

describe('walkJsonSchema', () => {
    it('should walk the schema and call the callback for each node', () => {
        const visited: unknown[] = [];
        
        walkJsonSchema({
            type: 'object',
            properties: {
                myProperty: {
                    type: 'string'
                },
                myArray: {
                    type: 'array',
                    items: {
                        type: 'number',
                    }
                }
            }
        }, (s) => {
            visited.push(s);
            return s;
        })

        expect(visited).toEqual([
            expect.objectContaining({
                type: 'object',
            }),
            expect.objectContaining({
                type: 'string'
            }),
            expect.objectContaining({
                type: 'array',
            }),
            expect.objectContaining({
                type: 'number',
            })
        ]);
    });   
})

describe('fixAllRefs', () => {
    it('should fix all refs to point to the components/schemas section instead of $defs', () => {
        const schema = {
            type: 'object',
            properties: {
                myProperty: {
                    '$ref': '#/$defs/MySchema'
                }
            }
        } as const

        expect(fixAllRefs({ schema })).toEqual({
            type: 'object',
            properties: {
                myProperty: {
                    '$ref': '#/components/schemas/MySchema'
                }
            }
        })
    })

    it('should fix refs that use # to point to the named schema', () => {
        const schema = {
            type: 'object',
            properties: {
                previousBook: {
                    '$ref': '#'
                }
            }
        } as const

        expect(fixAllRefs({ schema, rootSchemaName: 'Book' })).toEqual({
            type: 'object',
            properties: {
                previousBook: {
                    '$ref': '#/components/schemas/Book'
                }
            }
        })
    })

    it('should throw error if schema is trying to reference itself but the schema has no name', () => {
        const schema = {
            type: 'object',
            properties: {
                previousBook: {
                    '$ref': '#'
                }
            }
        } as const

        expect(() => fixAllRefs({ schema })).toThrow('[fixAllRefs] rootSchemaName is required when fixing a ref to #');
    })
})