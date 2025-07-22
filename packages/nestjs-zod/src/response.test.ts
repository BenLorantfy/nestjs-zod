import { Body, Controller, Module, Post, Type } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "./cleanupOpenApiDoc";
import { z } from "zod/v4";
import { z as z3 } from "zod/v3";
import { createZodDto } from "./dto";
import { ZodResponse } from "./response";
import { get } from "lodash";
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodSerializerInterceptor } from "./serializer";
import { ZodValidationPipe } from "./pipe";

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
        createBook2(@Body() book: BookDto) {
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

    const { app, openApiDoc } = await setup(BookController)

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

async function setup(controllerClass: Type<unknown>) {
    @Module({
        imports: [],
        controllers: [controllerClass],
        providers: [
          {
            provide: APP_PIPE,
            useClass: ZodValidationPipe,
          },
          {
            provide: APP_INTERCEPTOR,
            useClass: ZodSerializerInterceptor,
          }
        ]
      })
      class AppModule {}


    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
    
      const app = moduleFixture.createNestApplication();
      await app.init();

    return {
        app,
        openApiDoc: cleanupOpenApiDoc(SwaggerModule.createDocument(app, new DocumentBuilder().build())),
    }
}