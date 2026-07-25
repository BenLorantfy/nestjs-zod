/* eslint-disable @typescript-eslint/no-explicit-any */
import { createMock } from '@golevelup/ts-jest';
import { CallHandler, Controller, ExecutionContext, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import request from 'supertest';
import { createZodDto } from './dto';
import { ZodSerializationException } from './exception';
import {
  createZodSerializerInterceptor,
  ZodSerializerDto,
  ZodSerializerInterceptor,
} from './serializer';

import { setupApp, testMany } from './testUtils';

testMany('interceptor should strip out password', async ({ z }) => {
  const UserSchema = z.object({
    username: z.string(),
  });

  class UserDto extends createZodDto(UserSchema) {}

  const testUser = {
    username: 'test',
    password: 'test',
  };

  const context = createMock<ExecutionContext>();

  const handler = createMock<CallHandler>({
    handle: () => of(testUser),
  });

  const reflector = createMock<Reflector>({
    getAllAndOverride: () => UserDto,
  });

  const interceptor = new ZodSerializerInterceptor(reflector);

  const userObservable = interceptor.intercept(context, handler);
  const user = (await lastValueFrom(userObservable)) as typeof testUser;

  expect(user.password).toBe(undefined);
  expect(user.username).toBe('test');
});

testMany(
  'wrong response shape should throw ZodSerializationException',
  async ({ z }) => {
    const UserSchema = z.object({
      username: z.string(),
    });

    class UserDto extends createZodDto(UserSchema) {}

    const context = createMock<ExecutionContext>();

    const handler = createMock<CallHandler>({
      handle: () => of({ user: 'test' }),
    });

    const reflector = createMock<Reflector>({
      getAllAndOverride: () => UserDto,
    });

    const interceptor = new ZodSerializerInterceptor(reflector);

    const userObservable = interceptor.intercept(context, handler);
    expect(lastValueFrom(userObservable)).rejects.toBeInstanceOf(
      ZodSerializationException,
    );
  },
);

testMany(
  'interceptor should not strip out password if no UserDto is defined',
  async ({ z }) => {
    const UserSchema = z.object({
      username: z.string(),
    });

    class UserDto extends createZodDto(UserSchema) {}

    const testUser = {
      username: 'test',
      password: 'test',
    };

    const context = createMock<ExecutionContext>();

    const handler = createMock<CallHandler>({
      handle: () => of(testUser),
    });

    const reflector = createMock<Reflector>({
      getAllAndOverride: jest.fn(),
    });

    const interceptor = new ZodSerializerInterceptor(reflector);

    const userObservable = interceptor.intercept(context, handler);
    const user = (await lastValueFrom(userObservable)) as typeof testUser;

    expect(user.password).toBe('test');
    expect(user.username).toBe('test');
  },
);

testMany('should throw an error if the response is invalid', async ({ z }) => {
  class BookDto extends createZodDto(
    z.object({
      id: z.string(),
    }),
  ) {}

  @Controller('books')
  class BookController {
    constructor() {}

    @Get()
    @ZodSerializerDto(BookDto)
    getBook() {
      return {};
    }
  }

  const { app } = await setupApp(BookController);

  await request(app.getHttpServer())
    .get('/books')
    .expect(500)
    .expect((res) => {
      expect(res.body).toEqual({
        message: 'Internal Server Error',
        statusCode: 500,
      });
    });
});

testMany(
  'should throw an error if the response is invalid when using arrays',
  async ({ z }) => {
    class BookDto extends createZodDto(
      z.object({
        id: z.string(),
      }),
    ) {}

    @Controller('books')
    class BookController {
      constructor() {}

      @Get()
      @ZodSerializerDto(BookDto)
      getBook() {
        return [];
      }
    }

    const { app } = await setupApp(BookController);

    await request(app.getHttpServer())
      .get('/books')
      .expect(500)
      .expect((res) => {
        expect(res.body).toEqual({
          message: 'Internal Server Error',
          statusCode: 500,
        });
      });
  },
);

testMany(
  'should properly serialize when using array syntax',
  async ({ z }) => {
    class BookDto extends createZodDto(
      z.object({
        id: z.string().default('new-book'),
      }),
    ) {}

    @Controller('books')
    class BookController {
      constructor() {}

      @Get()
      @ZodSerializerDto([BookDto])
      getBook() {
        return [{}, {}];
      }
    }

    const { app } = await setupApp(BookController);

    await request(app.getHttpServer())
      .get('/books')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([
          {
            id: 'new-book',
          },
          {
            id: 'new-book',
          },
        ]);
      });
  },
  ['3', '4.0.0', 'latest'],
);

testMany(
  'should include input data in issues when reportInput is true',
  async ({ z }) => {
    class BookDto extends createZodDto(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    ) {}

    @Controller('books')
    class BookController {
      constructor() {}

      @Get()
      @ZodSerializerDto(BookDto)
      getBook() {
        return { id: 123, title: 'Test Book' }; // id is number, should be string
      }
    }

    const CustomInterceptor = createZodSerializerInterceptor({
      reportInput: true,
    });
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
        const issueWithInput = res.body.issues.find(
          (issue: any) => 'input' in issue,
        );
        expect(issueWithInput).toBeDefined();
        expect(issueWithInput.input).toBe(123); // The input value for the id field
      });
  },
  ['latest', '4.0.0'],
);
