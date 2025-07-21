import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { V3Module } from './zod-v3/v3.module';
import { V4Module } from './zod-v4/v4.module';
import { cleanupOpenApiDoc } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup zod v3 example
  const zodV3Document = SwaggerModule.createDocument(app, 
      new DocumentBuilder()
        .setTitle('Example API')
        .setDescription('Example API description')
        .setVersion('1.0')
        .build(), 
    {
      include: [V3Module],
    }
  );
  SwaggerModule.setup('api/zod-v3', app, cleanupOpenApiDoc(zodV3Document));

  // Setup zod v4 example
  const zodV4Document = SwaggerModule.createDocument(app, 
    new DocumentBuilder()
      .setTitle('Example API')
      .setDescription('Example API description')
      .setVersion('1.0')
      .build(), 
    {
      include: [V4Module],
    }
  );
  SwaggerModule.setup('api/zod-v4', app, cleanupOpenApiDoc(zodV4Document));

  await app.listen(3000);
}
bootstrap();
