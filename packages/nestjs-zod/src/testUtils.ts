import {
  ArgumentsHost,
  Catch,
  HttpException,
  Module,
  Type,
} from '@nestjs/common'
import {
  APP_FILTER,
  APP_INTERCEPTOR,
  APP_PIPE,
  BaseExceptionFilter,
} from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test, TestingModule } from '@nestjs/testing'
import { Response } from 'express'
import { ZodError } from 'zod/v4'
import { cleanupOpenApiDoc } from './cleanupOpenApiDoc'
import { ZodSerializationException } from './exception'
import { ZodValidationPipe } from './pipe'
import { ZodSerializerInterceptor } from './serializer'

export async function setupApp(
  controllerClass: Type<unknown>,
  {
    includeIssuesInSerializationErrorResponses,
  }: { includeIssuesInSerializationErrorResponses?: boolean } = {}
) {
  @Catch(HttpException)
  class HttpExceptionFilter extends BaseExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
      const ctx = host.switchToHttp()
      const response = ctx.getResponse<Response>()
      const status = exception.getStatus()

      if (exception instanceof ZodSerializationException) {
        const zodError = exception.getZodError()

        if (zodError instanceof ZodError) {
          response.status(status).json({
            statusCode: status,
            message: 'Internal Server Error',
            issues: zodError.issues,
          })
          return
        }
      }

      super.catch(exception, host)
    }
  }

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
  }).compile()

  const app = moduleFixture.createNestApplication()
  await app.init()

  return {
    app,
    openApiDoc: cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, new DocumentBuilder().build())
    ),
  }
}
