import { Module } from '@nestjs/common';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { V3Module } from './zod-v3/v3.module';
import { V4Module } from './zod-v4/v4.module';
import { HttpExceptionFilter } from './http-exception.filter';


@Module({
  imports: [V3Module, V4Module],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ]
})
export class AppModule {}
