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
import * as zodV4Core from 'zod/v4/core';

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

type BaseVersion = '3' | '4.0.0' | 'latest' | 'latest/mini';
type DirtyVersion = `${BaseVersion} - dirty`;
type Version = BaseVersion | DirtyVersion;
type ZForVersions<V extends Version> = 'latest/mini' extends V
  ? typeof zMini
  : typeof z4;

export function testMany<V extends Version = BaseVersion>(
  name: string,
  fn:
    | (({
        z,
        cleanUp,
      }: {
        z: ZForVersions<V>;
        cleanUp: boolean;
      }) => Promise<void>)
    | (({ z, cleanUp }: { z: ZForVersions<V>; cleanUp: boolean }) => void),
  versions: V[] = ['3', '4.0.0', 'latest', 'latest/mini'] as V[],
) {
  describe(name, () => {
    beforeEach(() => {
      z4.globalRegistry.clear();
      zMini.globalRegistry.clear();
      z4_0_0.globalRegistry.clear();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test.each(versions)('%s', (version) => {
      const isDirty = version.endsWith(' - dirty');
      const baseVersion = (
        isDirty ? version.replace(' - dirty', '') : version
      ) as BaseVersion;

      const versionedToJSONSchema: Record<BaseVersion, unknown> = {
        '3': undefined,
        '4.0.0': z4_0_0.toJSONSchema,
        latest: z4.toJSONSchema,
        'latest/mini': zMini.toJSONSchema,
      };
      const versionedGlobalRegistry: Record<
        BaseVersion,
        typeof zodV4Core.globalRegistry | undefined
      > = {
        '3': undefined,
        '4.0.0':
          z4_0_0.globalRegistry as unknown as typeof zodV4Core.globalRegistry,
        latest: z4.globalRegistry,
        'latest/mini': zMini.globalRegistry,
      };
      const toJSONSchemaMock = versionedToJSONSchema[baseVersion];
      if (toJSONSchemaMock) {
        jest
          .spyOn(zodV4Core, 'toJSONSchema')
          .mockImplementation(toJSONSchemaMock);
      }
      const globalRegistryMock = versionedGlobalRegistry[baseVersion];
      if (
        globalRegistryMock &&
        globalRegistryMock !== zodV4Core.globalRegistry
      ) {
        jest
          .spyOn(zodV4Core.globalRegistry, 'get')
          .mockImplementation((schema) =>
            globalRegistryMock.get(
              schema as Parameters<typeof globalRegistryMock.get>[0],
            ),
          );
      }

      return fn({
        z: {
          '3': z3,
          '4.0.0': z4_0_0,
          latest: z4,
          'latest/mini': zMini,
        }[baseVersion] as unknown as ZForVersions<V>,
        cleanUp: !isDirty,
      });
    });
  });
}
