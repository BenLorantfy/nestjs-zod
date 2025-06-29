import { Body, Controller, Delete, Get, Head, Module, Options, Param, Patch, Post, Put, Query, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBody, ApiOkResponse, ApiResponse, DocumentBuilder } from '@nestjs/swagger';
import z from 'zod/v4';
import { createZodDto } from './dto';
import { SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from './cleanupOpenApiDoc';
import get from 'lodash/get';
import { PREFIX } from './const';

describe('cleanupOpenApiDoc', () => {
    test.each([
        { cleanUp: true, description: 'cleaned doc' },
        { cleanUp: false, description: 'uncleaned doc' } // basic use-case should work without cleanup phase
    ])('basic - $description', async ({ cleanUp }) => {
        class BookDto extends createZodDto(z.object({
            title: z.string(),
        })) { }

        @Controller()
        class BookController {
            constructor() { }

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController, { cleanUp });
        expect(doc).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        properties: {
                            title: {
                                type: 'string'
                            }
                        },
                        required: [
                            'title'
                        ],
                        type: 'object'
                    }
                }
            },
            paths: {
                '/': {
                    post: {
                        operationId: 'BookController_createBook',
                        parameters: [],
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        '$ref': '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        },
                        responses: expect.anything(),
                        tags: [
                            "Book"
                        ]
                    }
                }
            }
        }));
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    test('with nested named schema', async () => {
        const Author = z.object({ name: z.string() }).meta({ id: "Author" });

        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: Author
        })) { }

        @Controller()
        class BookController {
            constructor() { }

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);

        expect(doc).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    Author: {
                        id: "Author",
                        properties: {
                            name: {
                                type: 'string'
                            }
                        },
                        required: ['name'],
                        type: 'object',
                    },
                    BookDto: {
                        properties: {
                            title: {
                                type: 'string'
                            },
                            author: {
                                '$ref': '#/components/schemas/Author'
                            }
                        },
                        required: [
                            'title',
                            'author'
                        ],
                        type: 'object'
                    }
                }
            },
            paths: {
                '/': {
                    post: {
                        operationId: 'BookController_createBook',
                        parameters: [],
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        '$ref': '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        },
                        responses: expect.anything(),
                        tags: [
                            "Book"
                        ]
                    }
                }
            }
        }));
    })

    test('named schemas', async () => {        
        class BookDto extends createZodDto(z.object({
            title: z.string(),
        }).meta({ id: 'Book' })) { }

        @Controller()
        class BookController {
            constructor() { }

            @Post()
            @ApiOkResponse({ type: BookDto })
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);

        // Renames the schema component itself
        expect(Object.keys(doc.components?.schemas || {})).toEqual(['Book']);

        // Renames the reference to the schema
        expect(get(doc, 'paths./.post.requestBody.content.application/json.schema.$ref')).toEqual("#/components/schemas/Book");
        expect(get(doc, 'paths./.post.responses.200.content.application/json.schema.$ref')).toEqual("#/components/schemas/Book");
    })

    test('named output schemas', async () => {        
        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: z.string().default('unknown'),
        }).meta({ id: 'Book2' })) { }

        @Controller()
        class BookController {
            constructor() { }

            @Post()
            @ApiOkResponse({ type: BookDto.Output })
            getBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);
        
        // Renames the schema component itself
        expect(Object.keys(doc.components?.schemas || {})).toEqual(['Book2', 'Book2_Output']);

        // Renames the reference to the schema
        expect(get(doc, 'paths./.post.requestBody.content.application/json.schema.$ref')).toEqual("#/components/schemas/Book2");
        expect(get(doc, 'paths./.post.responses.200.content.application/json.schema.$ref')).toEqual("#/components/schemas/Book2_Output");

        // Ensure Book2 is the input version of the schema and Book2_Output is the output version of the schema
        expect(get(doc, 'components.schemas.Book2.required')).toEqual(['title']);
        expect(get(doc, 'components.schemas.Book2_Output.required')).toEqual(['title', 'author']);

        // IDs should be correct
        expect(get(doc, 'components.schemas.Book2.id')).toEqual('Book2');
        expect(get(doc, 'components.schemas.Book2_Output.id')).toEqual('Book2_Output');
    })

    test.skip('query param', async () => {
        class QueryParamsDto extends createZodDto(z.object({
            filter: z.string(),
        })) { }

        @Controller()
        class BookController {
            constructor() { }

            @Get()
            getBooks(@Query() query: QueryParamsDto) {
                return [];
            }
        }

        const doc = await getSwaggerDoc(BookController);

        expect(doc).toEqual({});
    })

    test.skip('names output schema Book instead of BookDto if only using as output', async () => {        
        class BookDto extends createZodDto(z.object({
            title: z.string(),
        }).meta({ id: 'Book' })) { }

        @Controller()
        class BookController {
            constructor() { }

            @Get()
            @ApiOkResponse({ type: BookDto.Output })
            getBook() {
                return {};
            }
        }

        const doc = await getSwaggerDoc(BookController);

        // Renames the schema component itself
        expect(Object.keys(doc.components?.schemas || {})).toEqual(['Book']);

        // Renames the reference to the schema
        expect(get(doc, 'paths./.post.responses.200.content.application/json.schema.$ref')).toEqual("#/components/schemas/Book");
    })
});

async function getSwaggerDoc(controllerClass: Type<unknown>, { cleanUp = true } = {}) {
    @Module({
        imports: [],
        controllers: [controllerClass],
        providers: []
    })
    class AppModule { }

    const app = await NestFactory.create(AppModule, {
        logger: false
    });
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    if (cleanUp) {
        return cleanupOpenApiDoc(doc);
    } else {
        return doc;
    }
}
