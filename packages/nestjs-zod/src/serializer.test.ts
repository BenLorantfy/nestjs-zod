import { createMock } from '@golevelup/ts-jest'
import { CallHandler, Controller, ExecutionContext, Get, Post } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { lastValueFrom, of } from 'rxjs'
import request from 'supertest'
import { createZodDto } from './dto'
import { ZodSerializationException } from './exception'
import { createZodSerializerInterceptor, ZodSerializerDto, ZodSerializerInterceptor } from './serializer'

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
    const user = await lastValueFrom(userObservable) as typeof testUser;
  
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
    const user = await lastValueFrom(userObservable) as typeof testUser;
  
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

describe('v4', () => {
  describe('createZodSerializerInterceptor', () => {
    test('should include input data in issues when reportInput is true', async () => {
      class BookDto extends createZodDto(z4.object({
        id: z4.string(),
        title: z4.string(),
      })) {}
  
      @Controller('books')
      class BookController {
        constructor() {}
  
        @Get()
        @ZodSerializerDto(BookDto)
        getBook() {
          return { id: 123, title: 'Test Book' }; // id is number, should be string
        }
      }
  
      const CustomInterceptor = createZodSerializerInterceptor({ reportInput: true });
      const { app } = await setupApp(BookController, {
        interceptor: CustomInterceptor,
        includeIssuesInSerializationErrorResponses: true,
      });
  
      await request(app.getHttpServer())
        .get('/books')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('issues');
          expect(Array.isArray(res.body.issues)).toBe(true);
          expect(res.body.issues.length).toBeGreaterThan(0);
          
          // Check that at least one issue has input property when reportInput is true
          // The input value is the value at the path where validation failed, not the entire object
          const issueWithInput = res.body.issues.find((issue: any) => 'input' in issue);
          expect(issueWithInput).toBeDefined();
          expect(issueWithInput.input).toBe(123); // The input value for the id field
        });
    })
  
    test('should not include input data in issues when reportInput is false', async () => {
      class BookDto extends createZodDto(z4.object({
        id: z4.string(),
        title: z4.string(),
      })) {}
  
      @Controller('books')
      class BookController {
        constructor() {}
  
        @Get()
        @ZodSerializerDto(BookDto)
        getBook() {
          return { id: 123, title: 'Test Book' }; // id is number, should be string
        }
      }
  
      const CustomInterceptor = createZodSerializerInterceptor({ reportInput: false });
      const { app } = await setupApp(BookController, {
        interceptor: CustomInterceptor,
        includeIssuesInSerializationErrorResponses: true,
      });
  
      await request(app.getHttpServer())
        .get('/books')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('issues');
          expect(Array.isArray(res.body.issues)).toBe(true);
          expect(res.body.issues.length).toBeGreaterThan(0);
          
          // Check that issues don't have input property when reportInput is false
          const issueWithInput = res.body.issues.find((issue: any) => 'input' in issue);
          expect(issueWithInput).toBeUndefined();
        });
    })
  
    test('should not include input data in issues when reportInput is undefined', async () => {
      class BookDto extends createZodDto(z4.object({
        id: z4.string(),
        title: z4.string(),
      })) {}
  
      @Controller('books')
      class BookController {
        constructor() {}
  
        @Get()
        @ZodSerializerDto(BookDto)
        getBook() {
          return { id: 123, title: 'Test Book' }; // id is number, should be string
        }
      }
  
      const CustomInterceptor = createZodSerializerInterceptor(); // reportInput undefined
      const { app } = await setupApp(BookController, {
        interceptor: CustomInterceptor,
        includeIssuesInSerializationErrorResponses: true,
      });
  
      await request(app.getHttpServer())
        .get('/books')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('issues');
          expect(Array.isArray(res.body.issues)).toBe(true);
          expect(res.body.issues.length).toBeGreaterThan(0);
          
          // Check that issues don't have input property when reportInput is undefined
          const issueWithInput = res.body.issues.find((issue: any) => 'input' in issue);
          expect(issueWithInput).toBeUndefined();
        });
    })
  
    test('should include input data in issues when reportInput is true and using encode with codec', async () => {
      const stringToDate = z4.codec(
        z4.iso.datetime(),
        z4.date(),
        {
          decode: (isoString) => new Date(isoString),
          encode: (date) => date.toISOString(),
        }
      );
  
      class BookDto extends createZodDto(z4.object({
        title: z4.string(),
        dateWritten: stringToDate,
      }), {
        codec: true,
      }) {}
  
      @Controller('books')
      class BookController {
        constructor() {}
  
        @Get()
        @ZodSerializerDto(BookDto)
        getBook() {
          // Return invalid data - dateWritten is a string instead of Date, so encode will fail
          // The codec expects a Date (output type) but receives a string
          return { title: 'Test Book', dateWritten: 'not-a-date' };
        }
      }
  
      const CustomInterceptor = createZodSerializerInterceptor({ reportInput: true });
      const { app } = await setupApp(BookController, {
        interceptor: CustomInterceptor,
        includeIssuesInSerializationErrorResponses: true,
      });
  
      await request(app.getHttpServer())
        .get('/books')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('issues');
          expect(Array.isArray(res.body.issues)).toBe(true);
          expect(res.body.issues.length).toBeGreaterThan(0);
          
          // Check that at least one issue has input property when reportInput is true and using encode
          const issueWithInput = res.body.issues.find((issue: any) => 'input' in issue);
          expect(issueWithInput).toBeDefined();
          // The input value is the value that failed validation during encode
          expect(issueWithInput.input).toBe('not-a-date');
        });
    })
  
    test('should not include input data in issues when reportInput is false and using encode with codec', async () => {
      const stringToDate = z4.codec(
        z4.iso.datetime(),
        z4.date(),
        {
          decode: (isoString) => new Date(isoString),
          encode: (date) => date.toISOString(),
        }
      );
  
      class BookDto extends createZodDto(z4.object({
        title: z4.string(),
        dateWritten: stringToDate,
      }), {
        codec: true,
      }) {}
  
      @Controller('books')
      class BookController {
        constructor() {}
  
        @Get()
        @ZodSerializerDto(BookDto)
        getBook() {
          // Return invalid data - dateWritten is a string instead of Date, so encode will fail
          return { title: 'Test Book', dateWritten: 'not-a-date' as any };
        }
      }
  
      const CustomInterceptor = createZodSerializerInterceptor({ reportInput: false });
      const { app } = await setupApp(BookController, {
        interceptor: CustomInterceptor,
        includeIssuesInSerializationErrorResponses: true,
      });
  
      await request(app.getHttpServer())
        .get('/books')
        .expect(500)
        .expect((res) => {
          expect(res.body).toHaveProperty('issues');
          expect(Array.isArray(res.body.issues)).toBe(true);
          expect(res.body.issues.length).toBeGreaterThan(0);
          
          // Check that issues don't have input property when reportInput is false and using encode
          const issueWithInput = res.body.issues.find((issue: any) => 'input' in issue);
          expect(issueWithInput).toBeUndefined();
        });
    })
  })
});

