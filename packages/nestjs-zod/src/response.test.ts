import { Body, Controller, Post, Get } from "@nestjs/common";
import { z } from "zod/v4";
import { z as z3 } from "zod/v3";
import { createZodDto } from "./dto";
import { ZodResponse } from "./response";
import { get } from "lodash";
import request from 'supertest';
import { setupApp } from "./testUtils";

test('serializes the return value and sets the openapi doc', async () => {
    class BookDto extends createZodDto(z.object({
        id: z.string().optional().default('new-book'),
    })) { }

    @Controller('books')
    class BookController {
        constructor() { }

        @Post()
        @ZodResponse({ 
            status: 201, 
            description: 'Create a book', 
            type: BookDto 
        })
        createBook(@Body() book: BookDto) {
            return book;
        }

        // No typescript error should be present here, because `id` is optional
        @Post('/2')
        @ZodResponse({ 
            status: 201, 
            description: 'Create a book', 
            type: BookDto 
        })
        async createBook2(@Body() book: BookDto) {
            return {}
        }

        @Post('/3')
        // @ts-expect-error - This should throw a typescript error, since `id` can not be a boolean
        @ZodResponse({ 
            status: 201, 
            description: 'Create a book', 
            type: BookDto 
        })
        createBook3(@Body() book: BookDto) {
            return {
                id: true
            }
        }
    }

    const { app, openApiDoc } = await setupApp(BookController)

    const schemaName = 'BookDto_Output';
    expect(get(openApiDoc, 'paths./books.post.responses.201.content.application/json.schema')).toEqual({
        $ref: `#/components/schemas/${schemaName}`
    });

    expect(get(openApiDoc, `components.schemas.${schemaName}`)).toEqual({
        type: 'object',
        properties: {
            id: { type: 'string', default: 'new-book' }
        },
        // The "output" jsonschema for the zod schema should mark `id` as
        // required
        required: ['id']
    });

    await request(app.getHttpServer())
        .post('/books')
        .send({})
        .expect(201)
        .expect((res) => {
            // The serializer should set the `id` field to `new-book`
            expect(res.body.id).toBe('new-book');
        });
})

test('serializes the return value and sets the openapi doc when using arrays', async () => {
    class BookDto extends createZodDto(z.object({
        id: z.string().optional().default('new-book'),
    })) { }

    @Controller('books')
    class BookController {
        constructor() { }

        @Get()
        @ZodResponse({ 
            status: 200, 
            description: 'Get books', 
            type: [BookDto] 
        })
        getBooks() {
            return [{ id: '1' }, { id: '2' }, {}];
        }
    }

    const { app, openApiDoc } = await setupApp(BookController)

    const schemaName = 'BookDto_Output';
    expect(get(openApiDoc, 'paths./books.get.responses.200.content.application/json.schema')).toEqual({
        items: {
            $ref: `#/components/schemas/${schemaName}`
        },
        type: 'array'
    });

    expect(get(openApiDoc, `components.schemas.${schemaName}`)).toEqual({
        type: 'object',
        properties: {
            id: { type: 'string', default: 'new-book' }
        },
        // The "output" jsonschema for the zod schema should mark `id` as
        // required
        required: ['id']
    });

    await request(app.getHttpServer())
        .get('/books')
        .send()
        .expect(200)
        .expect((res) => {
            expect(res.body).toEqual([
                { id: '1' },
                { id: '2' },
                { id: 'new-book' }
            ]);
        });
})

test('throws error if trying to use zod v3', () => {
    class BookDto extends createZodDto(z3.object({
        name: z3.string(),
    })) { }

    expect(() => {
        @Controller('books')
        class BookController {
            constructor() { }
    
            @Post()
            @ZodResponse({ 
                status: 201, 
                description: 'Create a book', 
                // @ts-expect-error - Testing runtime check
                type: BookDto 
            })
            createBook(@Body() book: BookDto) {
                return book;
            }
        }
    }).toThrow('ZodResponse can only be called with zod v4 schemas')

})
