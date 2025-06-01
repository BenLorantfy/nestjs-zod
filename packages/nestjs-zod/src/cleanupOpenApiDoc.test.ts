import { Body, Controller, Delete, Get, Head, Module, Options, Param, Patch, Post, Put, Query, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBody, ApiResponse, DocumentBuilder } from '@nestjs/swagger';
import z from 'zod/v4';
import { createZodDto } from './dto';
import { SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from './cleanupOpenApiDoc';

describe('cleanupOpenApiDoc', () => {
    test('simple openapi doc', async () => {
        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: z.string(),
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                            author: {
                                type: 'string'
                            }
                        },
                        required: ['title', 'author']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('some misc zod types', async () => {
        class BookDto extends createZodDto(z.object({
            myBoolean: z.boolean(),
            myCuid: z.cuid(),
            myNum: z.int().lt(100).gt(0),
            myNull: z.null(),
            myRecord: z.record(z.string(), z.number()),
            myTuple: z.tuple([z.string(), z.string()]),
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);
        expect(JSON.stringify(doc, null, 2)).not.toContain('__nestjs-zod__');

        expect(doc).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            myBoolean: {
                                type: 'boolean'
                            },
                            myCuid: {
                                type: 'string',
                                pattern: '^[cC][^\\s-]{8,}$',
                                format: 'cuid'
                            },
                            myNum: {
                                type: 'integer',
                                exclusiveMinimum: 0,
                                exclusiveMaximum: 100
                            },
                            myNull: {
                                type: 'null'
                            },
                            myRecord: {
                                type: 'object',
                                propertyNames: {
                                    type: 'string',
                                },
                                additionalProperties: {
                                    type: 'number',
                                }
                            },
                            myTuple: {
                                type: 'array',
                                prefixItems: [
                                    {
                                        type: 'string',
                                    },
                                    {
                                        type: 'string',
                                    }
                                ]
                            }
                        },
                        required: [
                            'myBoolean',
                            'myCuid',
                            'myNum',
                            'myNull',
                            'myRecord',
                            'myTuple'
                        ]
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('union', async () => {
        class BookDto extends createZodDto(z.object({
            myUnion: z.union([
                z.number(),
                z.string(),
            ])
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);
        const stringified = JSON.stringify(doc, null, 2);
        expect(stringified).not.toContain('__nestjs-zod__');

        expect(doc).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            myUnion: {
                                anyOf: [
                                    {
                                        type: 'number'
                                    },
                                    {
                                        type: 'string'
                                    }
                                ]
                            }
                        },
                        required: ['myUnion']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('discriminated union', async () => {
        class BookDto extends createZodDto(z.object({
            author: z.discriminatedUnion('name', [
                z.object({
                    name: z.literal('ben'),
                }),
                z.object({
                    name: z.literal('zach'),
                }),
            ])
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);
        const stringified = JSON.stringify(doc, null, 2);
        expect(stringified).not.toContain('__nestjs-zod__');

        expect(doc).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            author: {
                                anyOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            name: {
                                                const: 'ben'
                                            }
                                        },
                                        required: ['name']
                                    },
                                    {
                                        type: 'object',
                                        properties: {
                                            name: {
                                                const: 'zach'
                                            }
                                        },
                                        required: ['name']
                                    }
                                ]
                            }
                        },
                        required: ['author']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('intersection', async () => {
        class BookDto extends createZodDto(z.object({
            myIntersection: z.intersection(
                z.string(),
                z.literal('hello')
            )
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);
        const stringified = JSON.stringify(doc, null, 2);

        expect(stringified).not.toContain('__nestjs-zod__');

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            myIntersection: {
                                allOf: [
                                    {
                                        type: 'string'
                                    },
                                    {
                                        const: 'hello'
                                    }
                                ]
                            }
                        },
                        required: ['myIntersection']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('constant', async () => {
        class BookDto extends createZodDto(z.object({
            myConstant: z.literal('hello')
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);
        const stringified = JSON.stringify(doc, null, 2);

        expect(stringified).not.toContain('__nestjs-zod__');

        expect(doc).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            myConstant: {
                                const: 'hello'
                            }
                        },
                        required: ['myConstant']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('array', async () => {
        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: z.string(),
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            @ApiBody({ type: [BookDto] })
            createBook(@Body() book: BookDto[]) {
                return book;
            }
        }

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                            author: {
                                type: 'string'
                            }
                        },
                        required: ['title', 'author']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            $ref: '#/components/schemas/BookDto'       
                                        }
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('schema with id', async () => {
        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: z.string(),
        }).meta({ id: 'Book' })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Get()
            getBook(@Body() book: BookDto) {
                return book;
            }

            @Post()
            @ApiResponse({ status: 201, description: 'The record has been successfully created.', type: BookDto })
            postBook(@Body() book: BookDto) {
                return book;
            }

            @Patch()
            patchBook(@Body() book: BookDto) {
                return book;
            }

            @Put()
            putBook(@Body() book: BookDto) {
                return book;
            }

            @Delete()
            deletBook(@Body() book: BookDto) {
                return book;
            }

            @Options()
            optionsBook(@Body() book: BookDto) {
                return book;
            }

            @Head()
            headBook(@Body() book: BookDto) {
                return book;
            }
        }

        const doc = await getSwaggerDoc(BookController);
        const stringified = JSON.stringify(doc, null, 2);

        expect(stringified).not.toContain('__nestjs-zod__');
        expect(stringified).not.toContain(BookDto.name);

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    Book: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                            author: {
                                type: 'string'
                            }
                        },
                        required: ['title', 'author']
                    }
                }
            },
            paths: expect.objectContaining({
                '/': expect.objectContaining({
                    get: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                }
                            },
                            required: true
                        }
                    }),
                    put: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                }
                            },
                            required: true
                        }
                    }),
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                }
                            },
                            required: true
                        },
                        responses: expect.objectContaining({
                            '201': expect.objectContaining({
                                content: {
                                    'application/json': {
                                        schema: {
                                            $ref: '#/components/schemas/Book'
                                        }
                                    }
                                }
                            })
                        })
                    }),
                    delete: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                }
                            },
                            required: true
                        }
                    }),
                    options: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                }
                            },
                            required: true
                        }
                    }),
                    head: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                }
                            },
                            required: true
                        }
                    }),
                    patch: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            })
        }));
    })

    test('array dto with schema with id', async () => {
        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: z.string(),
        }).meta({ id: 'Book2' })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            @ApiBody({ type: [BookDto] })
            @ApiResponse({ status: 201, type: [BookDto] })
            createBook(@Body() book: BookDto[]) {
                return book;
            }
        }

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    Book2: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                            author: {
                                type: 'string'
                            }
                        },
                        required: ['title', 'author']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            $ref: '#/components/schemas/Book2'       
                                        }
                                    }
                                }
                            },
                            required: true
                        },
                        responses: expect.objectContaining({
                            '201': expect.objectContaining({
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: {
                                                $ref: '#/components/schemas/Book2'
                                            }
                                        }
                                    }
                                }
                            })
                        })
                    })
                })
            }
        }));
    })

    test('schema with property that references registered zod schemas', async () => {
        const Author = z.object({
            name: z.string(),
        }).meta({ id: 'Author' })

        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: Author,
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    Author: {
                        $schema: expect.any(String),
                        id: 'Author',
                        properties: {
                            name: {
                                type: 'string'
                            }
                        },
                        required: ['name'],
                        type: 'object',
                    },
                    BookDto: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                            author: {
                                $ref: '#/components/schemas/Author'
                            }
                        },
                        required: ['title', 'author']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('schema with property that references registered zod enum schema', async () => {
        const Visibility = z.enum(['public', 'private']).meta({ id: 'Visibility' })

        class BookDto extends createZodDto(z.object({
            title: z.string(),
            visibility: Visibility,
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    Visibility: {
                        $schema: expect.any(String),
                        id: 'Visibility',
                        enum: ['public', 'private'],
                    },
                    BookDto: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                            visibility: {
                                $ref: '#/components/schemas/Visibility'
                            }
                        },
                        required: ['title', 'visibility']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })

    test('query parameter dto with schema with id', async () => {
        class BookQueryParametersDto extends createZodDto(z.object({
            title: z.string(),
            author: z.string(),
        }).meta({ id: 'BookQueryParameters' })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Get()
            getBook(@Query() queryParams: BookQueryParametersDto) {
                return [];
            }
        }

        const doc = await getSwaggerDoc(BookController);
        const stringified = JSON.stringify(doc, null, 2);

        expect(stringified).not.toContain('__nestjs-zod__');
        expect(stringified).not.toContain(BookQueryParametersDto.name);

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            paths: expect.objectContaining({
                '/': expect.objectContaining({
                    get: expect.objectContaining({
                        parameters: [
                            {
                                in: 'query',
                                name: 'title',
                                required: true,
                                schema: {
                                    type: 'string'
                                }
                            },
                            {
                                in: 'query',
                                name: 'author',
                                required: true,
                                schema: {
                                    type: 'string'
                                }
                            }
                        ]
                    })
                })
            })
        }));
    })

    test('path parameter dto with schema with id', async () => {
        class BookParametersDto extends createZodDto(z.object({
            id: z.string(),
        }).meta({ id: 'BookParameters' })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Get(':id')
            getBook(@Param() params: BookParametersDto) {
                return [];
            }
        }

        const doc = await getSwaggerDoc(BookController);
        const stringified = JSON.stringify(doc, null, 2);

        expect(stringified).not.toContain('__nestjs-zod__');
        expect(stringified).not.toContain(BookParametersDto.name);

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            paths: expect.objectContaining({
                '/{id}': expect.objectContaining({
                    get: expect.objectContaining({
                        parameters: [
                            {
                                in: 'path',
                                name: 'id',
                                required: true,
                                schema: {
                                    type: 'string'
                                }
                            }
                        ]
                    })
                })
            })
        }));
    })

    test('nullish properties', async () => {
        class BookDto extends createZodDto(z.object({
            title: z.string(),
            author: z.string().nullish()
        })) {}

        @Controller()
        class BookController {
            constructor() {}

            @Post()
            createBook(@Body() book: BookDto) {
                return book;
            }
        }

        expect(await getSwaggerDoc(BookController)).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    BookDto: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                            author: {
                                type: 'string',
                                nullable: true
                            }
                        },
                        required: ['title']
                    }
                }
            },
            paths: {
                '/': expect.objectContaining({
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/BookDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                })
            }
        }));
    })
});

async function getSwaggerDoc(controllerClass: Type<unknown>) {
    @Module({
        imports: [],
        controllers: [controllerClass],
        providers: []
    })
    class AppModule {}

    const app = await NestFactory.create(AppModule, {
        logger: false
    });
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    return cleanupOpenApiDoc(doc);
}