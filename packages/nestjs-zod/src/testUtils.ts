import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "./pipe";
import { ZodSerializerInterceptor } from "./serializer";
import { Type } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { cleanupOpenApiDoc } from "./cleanupOpenApiDoc";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export async function setupApp(controllerClass: Type<unknown>) {
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