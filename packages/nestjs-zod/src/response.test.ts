import { Body, Controller, Get, Post } from '@nestjs/common'
import { get } from 'lodash'
import request from 'supertest'
import { z } from 'zod/v4'
import { z as zMini } from 'zod/v4-mini'
import { createZodDto } from './dto'
import { ZodResponse } from './response'
import { setupApp } from './testUtils'

test('serializes the return value and sets the openapi doc', async () => {
  class BookDto extends createZodDto(
    z.object({
      id: z.string().optional().default('new-book'),
    })
  ) {}

  @Controller('books')
  class BookController {
    constructor() {}

    @Post()
    @ZodResponse({
      type: BookDto,
    })
    createBook(@Body() book: BookDto) {
      return book
    }

    // No typescript error should be present here, because `id` is optional
    @Post('/2')
    @ZodResponse({
      type: BookDto,
    })
    async createBook2(@Body() book: BookDto) {
      return {}
    }

    @Post('/3')
    // @ts-expect-error - This should throw a typescript error, since `id` can not be a boolean
    @ZodResponse({
      type: BookDto,
    })
    createBook3(@Body() book: BookDto) {
      return {
        id: true,
      }
    }
  }

  const { app, openApiDoc } = await setupApp(BookController)

  const schemaName = 'BookDto_Output'
  expect(
    get(
      openApiDoc,
      'paths./books.post.responses.default.content.application/json.schema'
    )
  ).toEqual({
    $ref: `#/components/schemas/${schemaName}`,
  })

  expect(get(openApiDoc, `components.schemas.${schemaName}`)).toEqual({
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', default: 'new-book' },
    },
    // The "output" jsonschema for the zod schema should mark `id` as
    // required
    required: ['id'],
  })

  await request(app.getHttpServer())
    .post('/books')
    .send({})
    .expect(201)
    .expect((res) => {
      // The serializer should set the `id` field to `new-book`
      expect(res.body.id).toBe('new-book')
    })
})

test('allows setting status code and description', async () => {
  class BookDto extends createZodDto(
    z.object({
      id: z.string(),
    })
  ) {}

  @Controller('books')
  class BookController {
    constructor() {}

    @Post()
    @ZodResponse({
      description: 'Create a book',
      status: 202,
      type: BookDto,
    })
    createBook(@Body() book: BookDto) {
      return book
    }
  }

  const { app, openApiDoc } = await setupApp(BookController)

  const schemaName = 'BookDto_Output'
  expect(
    get(
      openApiDoc,
      'paths./books.post.responses.202.content.application/json.schema'
    )
  ).toEqual({
    $ref: `#/components/schemas/${schemaName}`,
  })

  expect(
    get(openApiDoc, 'paths./books.post.responses.202.description')
  ).toEqual('Create a book')

  await request(app.getHttpServer())
    .post('/books')
    .send({ id: '1' })
    .expect(202)
})

test('serializes the return value and sets the openapi doc when using arrays', async () => {
  class BookDto extends createZodDto(
    z.object({
      id: z.string().optional().default('new-book'),
    })
  ) {}

  @Controller('books')
  class BookController {
    constructor() {}

    @Get()
    @ZodResponse({
      status: 200,
      description: 'Get books',
      type: [BookDto],
    })
    getBooks() {
      return [{ id: '1' }, { id: '2' }, {}]
    }
  }

  const { app, openApiDoc } = await setupApp(BookController)

  const schemaName = 'BookDto_Output'
  expect(
    get(
      openApiDoc,
      'paths./books.get.responses.200.content.application/json.schema'
    )
  ).toEqual({
    items: {
      $ref: `#/components/schemas/${schemaName}`,
    },
    type: 'array',
  })

  expect(get(openApiDoc, `components.schemas.${schemaName}`)).toEqual({
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', default: 'new-book' },
    },
    // The "output" jsonschema for the zod schema should mark `id` as
    // required
    required: ['id'],
  })

  await request(app.getHttpServer())
    .get('/books')
    .send()
    .expect(200)
    .expect((res) => {
      expect(res.body).toEqual([{ id: '1' }, { id: '2' }, { id: 'new-book' }])
    })
})

test('responds with 500 error if the response is invalid when using arrays', async () => {
  class BookDto extends createZodDto(
    z.object({
      id: z.string(),
    })
  ) {}

  @Controller('books')
  class BookController {
    constructor() {}

    @Get()
    // @ts-expect-error
    @ZodResponse({
      status: 200,
      description: 'Get books',
      type: [BookDto],
    })
    getBooks() {
      return {}
    }
  }

  const { app } = await setupApp(BookController, {
    includeIssuesInSerializationErrorResponses: true,
  })

  await request(app.getHttpServer())
    .get('/books')
    .send()
    .expect(500)
    .expect((res) => {
      expect(res.body).toEqual({
        statusCode: 500,
        message: 'Internal Server Error',
        issues: [
          {
            code: 'invalid_type',
            expected: 'array',
            message: 'Invalid input: expected array, received object',
            path: [],
          },
        ],
      })
    })
})

test('throws error if trying to use array syntax with zod mini', async () => {
  class BookDto extends createZodDto(
    zMini.object({
      id: zMini.string(),
    })
  ) {}

  expect(() => {
    @Controller('books')
    class BookController {
      constructor() {}

      @Get()
      // @ts-expect-error - Should be a typescript error here because zod mini schemas don't have an `array` method
      @ZodResponse({
        status: 200,
        description: 'Get books',
        type: [BookDto],
      })
      getBooks() {
        return []
      }
    }
  }).toThrow(
    '[nestjs-zod] ZodSerializerDto was used with array syntax (e.g. `ZodSerializerDto([MyDto])`) but the DTO schema does not have an array method'
  )
})

test('throws error if trying to use DTO.Output', () => {
  class BookDto extends createZodDto(
    z.object({
      id: z.string(),
    })
  ) {}

  expect(() => {
    @Controller('books')
    class BookController {
      constructor() {}

      @Get()
      // @ts-expect-error - Should have a typescript here when trying to use DTO.Output
      @ZodResponse({
        status: 200,
        description: 'Get books',
        type: [BookDto.Output],
      })
      getBooks() {
        return []
      }
    }
  }).toThrow(
    '[nestjs-zod] ZodResponse automatically uses the output version of the DTO, there is no need to use DTO.Output'
  )

  expect(() => {
    @Controller('books')
    class BookController {
      constructor() {}

      @Get()
      @ZodResponse({
        status: 200,
        description: 'Get books',
        // @ts-expect-error - Should have a typescript here when trying to use DTO.Output
        type: BookDto.Output,
      })
      getBooks() {
        return []
      }
    }
  }).toThrow(
    '[nestjs-zod] ZodResponse automatically uses the output version of the DTO, there is no need to use DTO.Output'
  )
})
