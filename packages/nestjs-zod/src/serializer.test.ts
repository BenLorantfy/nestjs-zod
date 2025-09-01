import { createMock } from '@golevelup/ts-jest'
import { CallHandler, Controller, ExecutionContext, Get, Post } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import request from 'supertest'
import { createZodDto } from './dto'
import { ZodSerializationException } from './exception'
import { ZodSerializerDto, ZodSerializerInterceptor } from './serializer'

import * as z3 from 'zod/v3'
import * as z4 from 'zod/v4'

import { setupApp } from './testUtils'

describe.each([
  { name: 'v4', z: z4 },
  { name: 'v3', z: z3 as unknown as typeof z4 }
])('$name', ({ z }) => {
  const UserSchema = z.object({
    username: z.string(),
  })
  
  class UserDto extends createZodDto(UserSchema) {}
  
  const testUser = {
    username: 'test',
    password: 'test',
  }
  
  const context = createMock<ExecutionContext>()
  
  test('interceptor should strip out password', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of(testUser),
    })
  
    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    })
  
    const interceptor = new ZodSerializerInterceptor(reflector)
  
    const userObservable = interceptor.intercept(context, handler)
    const user: typeof testUser = await lastValueFrom(userObservable)
  
    expect(user.password).toBe(undefined)
    expect(user.username).toBe('test')
  })
  
  test('wrong response shape should throw ZodSerializationException', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of({ user: 'test' }),
    })
  
    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    })
  
    const interceptor = new ZodSerializerInterceptor(reflector)
  
    const userObservable = interceptor.intercept(context, handler)
    expect(lastValueFrom(userObservable)).rejects.toBeInstanceOf(
      ZodSerializationException
    )
  })
  
  test('interceptor should not strip out password if no UserDto is defined', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of(testUser),
    })
  
    const reflector = createMock<Reflector>({
      getAllAndOverride: jest.fn(),
    })
  
    const interceptor = new ZodSerializerInterceptor(reflector)
  
    const userObservable = interceptor.intercept(context, handler)
    const user: typeof testUser = await lastValueFrom(userObservable)
  
    expect(user.password).toBe('test')
    expect(user.username).toBe('test')
  })

  test('should throw an error if the response is invalid', async () => {
    class BookDto extends createZodDto(z.object({
      id: z.string(),
  })) { }
  
    @Controller('books')
    class BookController {
        constructor() { }
  
        @Get()
        @ZodSerializerDto(BookDto)
        getBook() {
            return {};
        }
    }
  
    const { app } = await setupApp(BookController)
  
    await request(app.getHttpServer())
    .get('/books')
    .expect(500)
    .expect((res) => {
      expect(res.body).toEqual({
        message: 'Internal Server Error',
        statusCode: 500,
      })
    });
  })

  test('should throw an error if the response is invalid when using arrays', async () => {
    class BookDto extends createZodDto(z.object({
      id: z.string(),
  })) { }
  
    @Controller('books')
    class BookController {
        constructor() { }
  
        @Get()
        @ZodSerializerDto(BookDto)
        getBook() {
            return [];
        }
    }
  
    const { app } = await setupApp(BookController)
  
    await request(app.getHttpServer())
    .get('/books')
    .expect(500)
    .expect((res) => {
      expect(res.body).toEqual({
        message: 'Internal Server Error',
        statusCode: 500,
      })
    });
  })

  test('should properly serialize when using array syntax', async () => {
    class BookDto extends createZodDto(z.object({
      id: z.string().default('new-book'),
  })) { }
  
    @Controller('books')
    class BookController {
        constructor() { }
  
        @Get()
        @ZodSerializerDto([BookDto])
        getBook() {
            return [{}, {}];
        }
    }
  
    const { app } = await setupApp(BookController)
  
    await request(app.getHttpServer())
    .get('/books')
    .expect(200)
    .expect((res) => {
      expect(res.body).toEqual([{
        id: 'new-book',
      }, {
        id: 'new-book',
      }])
    });
  })
});

