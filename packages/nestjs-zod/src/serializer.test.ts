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

  test('should not include input in error when reportInput is false or undefined', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of({ username: 123 }),
    })

    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    })

    const interceptor = new ZodSerializerInterceptor(reflector)

    const userObservable = interceptor.intercept(context, handler)
    
    try {
      await lastValueFrom(userObservable)
      fail('Should have thrown an error')
    } catch (error: any) {
      const zodError = error.getZodError()
      // Check that the error has issues but input field should not be present
      expect(zodError.issues).toBeDefined()
      expect(zodError.issues.length).toBeGreaterThan(0)
      expect(zodError.issues[0].input).toBeUndefined()
    }
  })
});

describe('v4 reportInput', () => {
  const z = z4
  const UserSchema = z.object({
    username: z.string(),
  })
  
  class UserDto extends createZodDto(UserSchema) {}
  
  const context = createMock<ExecutionContext>()

  test('should include input in error when reportInput is true', async () => {
    const handler = createMock<CallHandler>({
      handle: () => of({ username: 123 }),
    })

    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    })

    const interceptor = new ZodSerializerInterceptor(reflector, true)

    const userObservable = interceptor.intercept(context, handler)
    
    await expect(lastValueFrom(userObservable)).rejects.toThrow()
    
    try {
      await lastValueFrom(userObservable)
    } catch (error: any) {
      const zodError = error.getZodError()
      // Check that the error has issues and at least one has input field
      expect(zodError.issues).toBeDefined()
      expect(zodError.issues.length).toBeGreaterThan(0)
      // In Zod v4, reportInput should add the input field
      expect(zodError.issues[0].input).toBeDefined()
      expect(zodError.issues[0].input).toBe(123)
    }
  })
});

