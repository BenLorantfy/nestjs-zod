import {
  APP_FILTER,
  APP_INTERCEPTOR,
  APP_PIPE,
  BaseExceptionFilter,
} from '@nestjs/core';
import { ZodValidationPipe } from './pipe';
import { ZodSerializerInterceptor } from './serializer';
import {
  ArgumentsHost,
  Catch,
  HttpException,
  NestInterceptor,
  PipeTransform,
  Type,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { cleanupOpenApiDoc } from './cleanupOpenApiDoc';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Response } from 'express';
import { ZodSerializationException } from './exception';
import { ZodError } from 'zod/v4';

import * as z3 from 'zod/v3';
import * as z4 from 'zod/v4';
import * as z4_0_0 from 'zod-v4_0_0';
import { z as zMini } from 'zod/v4-mini';

export async function setupApp(
  controllerClass: Type<unknown>,
  {
    includeIssuesInSerializationErrorResponses,
    interceptor,
    pipe,
  }: {
    includeIssuesInSerializationErrorResponses?: boolean;
    interceptor?: new (...args: unknown[]) => NestInterceptor;
    pipe?: Type<PipeTransform>;
  } = {},
) {
  @Catch(HttpException)
  class HttpExceptionFilter extends BaseExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const status = exception.getStatus();

      if (exception instanceof ZodSerializationException) {
        const zodError = exception.getZodError();

        if (zodError instanceof ZodError) {
          response.status(status).json({
            statusCode: status,
            message: 'Internal Server Error',
            issues: zodError.issues,
          });
          return;
        }
      }

      super.catch(exception, host);
    }
  }

  @Module({
    imports: [],
    controllers: [controllerClass],
    providers: [
      {
        provide: APP_PIPE,
        useClass: pipe || ZodValidationPipe,
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: interceptor || ZodSerializerInterceptor,
      },
      ...(includeIssuesInSerializationErrorResponses
        ? [
            {
              provide: APP_FILTER,
              useClass: HttpExceptionFilter,
            },
          ]
        : []),
    ],
  })
  class AppModule {}

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return {
    app,
    openApiDoc: cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, new DocumentBuilder().build()),
    ),
  };
}

type Version = '3' | '4.0.0' | 'latest' | 'latest/mini';
type ZForVersions<V extends Version> = 'latest/mini' extends V ? typeof zMini : typeof z4;

export function testMany<V extends Version = Version>(
  name: string,
  fn: ({ z }: { z: ZForVersions<V> }) => Promise<void>,
  versions: V[] = ['3', '4.0.0', 'latest', 'latest/mini'] as V[],
) {
  describe(name, () => {
    beforeEach(() => {
      z4.globalRegistry.clear();
      zMini.globalRegistry.clear();
      z4_0_0.globalRegistry.clear();
    });

    test.each(versions)('%s', (version) =>
      fn({
        z: {
          '3': z3,
          '4.0.0': z4_0_0,
          'latest': z4,
          'latest/mini': zMini,
        }[version] as unknown as ZForVersions<V>,
      }));
  })
}