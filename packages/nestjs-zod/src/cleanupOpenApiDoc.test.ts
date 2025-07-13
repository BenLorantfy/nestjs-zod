import { Body, Controller, Delete, Get, Head, Module, Options, Param, Patch, Post, Put, Query, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBody, ApiOkResponse, ApiProperty, ApiResponse, DocumentBuilder } from '@nestjs/swagger';
import z from 'zod/v4';
import { createZodDto } from './dto';
import { SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from './cleanupOpenApiDoc';
import get from 'lodash/get';
import { PREFIX } from './const';
import { IsString } from 'class-validator';

describe('cleanupOpenApiDoc', () => {
    test.each([
        { cleanUp: true, description: 'cleaned doc' },
        { cleanUp: false, description: 'uncleaned doc' } // basic use-case should work without cleanup phase
    ])('basic request body - $description', async ({ cleanUp }) => {
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

    test.each([
        { cleanUp: true, description: 'cleaned doc' },
        { cleanUp: false, description: 'uncleaned doc' } // basic use-case should work without cleanup phase
    ])('basic query params - $description', async ({ cleanUp }) => {
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

        const doc = await getSwaggerDoc(BookController, { cleanUp });

        expect(get(doc, 'paths./.get.parameters')).toEqual([
            {
                in: 'query',
                name: 'filter',
                required: true,
                schema: {
                    type: 'string'
                }
            }
        ]);
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

    test('query param union', async () => {
        class QueryParamsDto extends createZodDto(z.object({
            filter: z.union([
                z.literal('published'),
                z.literal('unpublished')
            ]),
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

        expect(get(doc, 'paths./.get.parameters')).toEqual([
            {
                in: 'query',
                name: 'filter',
                required: true,
                schema: {
                    anyOf: [
                        {
                            type: 'string',
                            const: 'published'
                        },
                        {
                            type: 'string',
                            const: 'unpublished'
                        }
                    ]
                }
            }
        ]);
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    test('query param with nested named schema', async () => {
        const BooleanString = z.enum(['true', 'false']).meta({ id: 'BooleanString' });

        class QueryParamsDto extends createZodDto(z.object({
            published: BooleanString,
            banned: BooleanString
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

        expect(doc.components?.schemas).toEqual({
            BooleanString: {
                enum: [
                    'true',
                    'false'
                ],
                id: 'BooleanString',
                type: 'string'
            }
        });

        expect(get(doc, 'paths./.get.parameters')).toEqual([
            {
                in: 'query',
                name: 'published',
                required: true,
                schema: {
                    $ref: '#/components/schemas/BooleanString'
                }
            },
            {
                in: 'query',
                name: 'banned',
                required: true,
                schema: {
                    $ref: '#/components/schemas/BooleanString'
                }
            }
        ]);
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    test('removes -parent-id from query param', async () => {
        class QueryParamsDto extends createZodDto(z.object({
            published: z.enum(['true', 'false']),
        }).meta({ id: 'QueryParams' })) { }

        @Controller()
        class BookController {
            constructor() { }

            @Get()
            getBooks(@Query() query: QueryParamsDto) {
                return [];
            }
        }

        const doc = await getSwaggerDoc(BookController);
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    test('allows mixing class-validator and zod schemas', async () => {
        class BookDto extends createZodDto(z.object({
            title: z.string(),
        })) { }

        class FruitDto {
            @IsString()
            @ApiProperty()
            name!: string;
        }

        @Controller()
        class MyController {
            constructor() { }

            @Post('/book')
            createBook(@Body() book: BookDto) {
                return book;
            }

            @Post('/fruit')
            createFruit(@Body() fruit: FruitDto) {
                return fruit;
            }
        }

        const doc = await getSwaggerDoc(MyController);
        expect(doc.components?.schemas).toEqual({
            BookDto: {
                properties: {
                    title: {
                        type: 'string'
                    }
                },
                required: ['title'],
                type: 'object'
            },
            FruitDto: {
                properties: {
                    name: {
                        type: 'string'
                    }
                },
                required: ['name'],
                type: 'object'
            }
        });
        expect(get(doc, 'paths./book.post.requestBody.content.application/json.schema.$ref')).toEqual('#/components/schemas/BookDto');
        expect(get(doc, 'paths./fruit.post.requestBody.content.application/json.schema.$ref')).toEqual('#/components/schemas/FruitDto');
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    });

    test('throws an error if a zod schema name conflicts with a class-validator schema name', async () => {
        class Fruit {
            @IsString()
            @ApiProperty()
            name!: string;
        }

        class Fruit2 extends createZodDto(z.object({
            color: z.string(),
        }).meta({ id: 'Fruit' })) { }

        @Controller()
        class MyController {
            constructor() { }

            @Post('/class-validator-fruit')
            createFruit1(@Body() fruit: Fruit) {
                return fruit;
            }

            @Post('/zod-fruit')
            createFruit2(@Body() fruit: Fruit2) {
                return fruit;
            }
        }

        await expect(getSwaggerDoc(MyController)).rejects.toEqual(new Error("[cleanupOpenApiDoc] Found multiple schemas with name `Fruit`.  Please review your schemas to ensure that you are not using the same schema name for different schemas"));
    });

    test('throws an error if a nested zod schema name conflicts with a class-validator schema name', async () => {
        class Car {
            @IsString()
            @ApiProperty()
            name!: string;
        }

        class Car2 extends createZodDto(z.object({
            car: z.object({
                color: z.string(),
            }).meta({ id: 'Car' })
        })) { }

        @Controller()
        class MyController {
            constructor() { }

            @Post('/class-validator-car')
            createCar1(@Body() car: Car) {
                return car;
            }

            @Post('/zod-car')
            createCar2(@Body() car: Car2) {
                return car;
            }
        }

        await expect(getSwaggerDoc(MyController)).rejects.toEqual(new Error("[cleanupOpenApiDoc] Found multiple schemas with name `Car`.  Please review your schemas to ensure that you are not using the same schema name for different schemas"));
    });

    test('throws an error if a named schema nested in a query param conflicts with a class-validator schema name', async () => {
        class Chair {
            @IsString()
            @ApiProperty()
            name!: string;
        }

        class Chair2 extends createZodDto(z.object({
            chair: z.enum(['oak', 'pine']).meta({ id: 'Chair' })
        })) { }

        @Controller()
        class MyController {
            constructor() { }

            @Post()
            createChair(@Body() chair: Chair) {
                return chair;
            }

            @Get()
            getChair(@Query() query: Chair2) {
                return query;
            }
        }

        await expect(getSwaggerDoc(MyController)).rejects.toEqual(new Error("[cleanupOpenApiDoc] Found multiple schemas with name `Chair`.  Please review your schemas to ensure that you are not using the same schema name for different schemas"));
    });

    test('allows using the same schema as a root DTO and a nested DTO', async () => {
        const Product = z.object({
            name: z.string(),
        }).meta({ id: 'Product' });
        
        class ProductDto extends createZodDto(Product) { }

        class RequestBodyDto extends createZodDto(z.object({
            product: Product
        })) { }

        @Controller()
        class MyController {
            constructor() { }

            @Post('/products1')
            createProduct(@Body() product: ProductDto) {
                return product;
            }

            @Post('/products2')
            createProduct2(@Body() product: RequestBodyDto) {
                return product;
            }
        }

        const doc = await getSwaggerDoc(MyController);
        expect(doc).toEqual(expect.objectContaining({
            components: {
                schemas: {
                    RequestBodyDto: {
                        type: 'object',
                        properties: {
                            product: {
                                '$ref': '#/components/schemas/Product'
                            }
                        },
                        required: ['product'],
                    },
                    Product: {
                        id: 'Product',
                        properties: {
                            name: {
                                type: 'string'
                            }
                        },
                        required: ['name'],
                        type: 'object'
                    }
                }
            },
            paths: {
                '/products1': {
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        '$ref': '#/components/schemas/Product'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                },
                '/products2': {
                    post: expect.objectContaining({
                        requestBody: {
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/RequestBodyDto'
                                    }
                                }
                            },
                            required: true
                        }
                    })
                }
            }
        }));
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    test('recursive schemas', async () => {
        const Node = z.object({
            name: z.string(),
            get children() {
              return z.array(Node)
            }
        });

        class NodeDto extends createZodDto(Node) { }

        @Controller()
        class WorkflowController {
            constructor() { }

            @Post()
            createWorkflow(@Body() workflow: NodeDto) {
                return workflow;
            }
        }

        const doc = await getSwaggerDoc(WorkflowController);
        expect(doc.components?.schemas).toEqual({
            NodeDto: {
                properties: {
                    children: {
                        items: {
                            '$ref': '#/components/schemas/NodeDto'
                        },
                        type: 'array'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['name', 'children'],
                type: 'object'
            }
        });
        expect(get(doc, 'paths./.post.requestBody.content.application/json.schema.$ref')).toEqual('#/components/schemas/NodeDto');
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    });

    test('recursive named schemas', async () => {
        const Node = z.object({
            name: z.string(),
            get children() {
              return z.array(Node)
            }
        }).meta({ id: 'Node' });

        class NodeDto extends createZodDto(Node) { }

        @Controller()
        class WorkflowController {
            constructor() { }

            @Post()
            createWorkflow(@Body() workflow: NodeDto) {
                return workflow;
            }
        }

        const doc = await getSwaggerDoc(WorkflowController);
        expect(doc.components?.schemas).toEqual({
            Node: {
                id: 'Node',
                properties: {
                    children: {
                        items: {
                            '$ref': '#/components/schemas/Node'
                        },
                        type: 'array'
                    },
                    name: {
                        type: 'string'
                    }
                },
                required: ['name', 'children'],
                type: 'object'
            }
        });
        expect(get(doc, 'paths./.post.requestBody.content.application/json.schema.$ref')).toEqual('#/components/schemas/Node');
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    });

    test('mutually recursive schemas', async () => {
        const User = z.object({
            name: z.string(),
            get posts(){
              return z.array(BlogPost)
            }
        });
           
        const BlogPost = z.object({
            title: z.string(),
            get author(){
              return User
            }
        });

        class UserDto extends createZodDto(User) { }

        @Controller()
        class MyController {
            constructor() { }

            @Post()
            createUser(@Body() user: UserDto) {
                return user;
            }
        }

        const doc = await getSwaggerDoc(MyController);
        expect(doc.components?.schemas).toEqual({
            UserDto: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                    },
                    posts: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                author: {
                                    '$ref': '#/components/schemas/UserDto'
                                },
                                title: {
                                    type: 'string',
                                }
                            },
                            required: ['title', 'author'],
                        }
                    },
                },
                required: ['name', 'posts'],
            }
        });
        expect(get(doc, 'paths./.post.requestBody.content.application/json.schema.$ref')).toEqual('#/components/schemas/UserDto');
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    test('mutually recursive named schemas', async () => {
        const User = z.object({
            name: z.string(),
            get posts(){
              return z.array(BlogPost)
            }
        }).meta({ id: 'User' });
           
        const BlogPost = z.object({
            title: z.string(),
            get author(){
              return User
            }
        }).meta({ id: 'BlogPost' });

        class UserDto extends createZodDto(User) { }

        @Controller()
        class MyController {
            constructor() { }

            @Post()
            createUser(@Body() user: UserDto) {
                return user;
            }
        }

        const doc = await getSwaggerDoc(MyController);
        expect(doc.components?.schemas).toEqual({
            BlogPost: {
                id: 'BlogPost',
                properties: {
                    author: {
                        '$ref': '#/components/schemas/User'
                    },
                    title: {
                        type: 'string',
                    }
                },
                required: ['title', 'author'],
                type: 'object'
            },
            User: {
                id: 'User',
                properties: {
                    name: {
                        type: 'string',
                    },
                    posts: {
                        type: 'array',
                        items: {
                            '$ref': '#/components/schemas/BlogPost'
                        }
                    }
                },
                required: ['name', 'posts'],
                type: 'object'
            }
        });
        expect(get(doc, 'paths./.post.requestBody.content.application/json.schema.$ref')).toEqual('#/components/schemas/User');
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    });

    test('throws an error if trying to use recursive schemas in parameters', async () => {
        const QueryParams = z.object({
            name: z.string(),
            get nestedQueryParams() {
              return z.array(QueryParams)
            }
        });

        class QueryParamsDto extends createZodDto(QueryParams) { }

        @Controller()
        class MyController {
            constructor() { }

            @Get()
            getThing(@Query() query: QueryParamsDto) {
                return query;
            }
        }

        await expect(getSwaggerDoc(MyController)).rejects.toEqual(new Error("[cleanupOpenApiDoc] Recursive schemas are not supported for parameters"));
    });

    test('throws an error if trying to use a named schema that is recursive with the root schema in parameters', async () => {
        const NestedQueryParams = z.object({
            get nestedQueryParams() {
                return QueryParams;
            }
        }).meta({ id: 'NestedQueryParams' });

        const QueryParams = z.object({
            name: z.string(),
            nestedQueryParams: NestedQueryParams
        });


        class QueryParamsDto extends createZodDto(QueryParams) { }

        @Controller()
        class MyController {
            constructor() { }

            @Get()
            getThing(@Query() query: QueryParamsDto) {
                return query;
            }
        }

        await expect(getSwaggerDoc(MyController)).rejects.toEqual(new Error("[cleanupOpenApiDoc] Recursive schemas are not supported for parameters"));
    });

    test('does not touch refs for schemas that are not from a zod dto', async () => {
        class MySchema {
            @ApiProperty({
                type: 'array',
                items: { 
                    $ref: '#/$defs/MyThing' 
                },
            })
            things!: unknown[];
        }

        class MyQueryParams {
            @ApiProperty({
                type: 'array',
                items: {
                    $ref: '#/$defs/MyFilter'
                }
            })
            filters!: unknown[];
        }

        @Controller()
        class MyController {
            constructor() { }
            
            @Post()
            createThing(@Query() query: MyQueryParams, @Body() thing: MySchema) {
                return thing;
            }
        }
        
        const doc = await getSwaggerDoc(MyController);
        expect(get(doc, 'components.schemas.MySchema.properties.things.items.$ref')).toEqual('#/$defs/MyThing');
        expect(get(doc, 'paths./.post.parameters[0].schema.items.$ref')).toEqual('#/$defs/MyFilter');
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    test('nullable fields', async () => {
        class BookDto extends createZodDto(z.object({
            title: z.string().nullable(),
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
        expect(get(doc, 'components.schemas.BookDto.properties.title')).toEqual({
            // This is the correct syntax for OpenAPI version 3.1
            // In 3.0, you're supposed to use `nullable: true` instead.  Maybe
            // we should add a parameter for consumers to specify which version
            // of OpenAPI they are using?
            anyOf: [
                {
                    type: 'string'
                },
                {
                    type: 'null'
                }
            ]
        });
        expect(JSON.stringify(doc)).not.toContain(PREFIX);
    })

    // TODO: write tests for recursive schemas

    // TODO: write test for mutually recursive named schemas where one schmea is additionally directly recursive with itself

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
