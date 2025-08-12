import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const openApiDoc = SwaggerModule.createDocument(app, 
    new DocumentBuilder()
      .setTitle('Example API')
      .setDescription('Example API description')
      .setVersion('1.0')
      .build()
  );

  SwaggerModule.setup('api', app, cleanupOpenApiDoc(openApiDoc));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
