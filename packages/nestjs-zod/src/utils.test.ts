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
                    '$ref': '#/$defs/myProperty'
                }
            }
        }

        expect(fixAllRefs(schema)).toEqual({
            type: 'object',
            properties: {
                myProperty: {
                    '$ref': '#/components/schemas/myProperty'
                }
            }
        })
    })
})