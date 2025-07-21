import { Module } from '@nestjs/common';
import { PeopleController } from './people/people.controller';
import { StarshipsController } from './starships/starships.controller';
import { HttpExceptionFilter } from './http-exception.filter';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';

@Module({
  imports: [],
  controllers: [PeopleController, StarshipsController],
  providers: [
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
