import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import z from 'zod';

class BookDto extends createZodDto(z.object({
  title: z.string().describe('The title of the book'),
}).meta({ id: 'Book' })) {}

class BookListDto extends createZodDto(z.array(BookDto.schema)) {}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/books')
  @ZodResponse({ type: BookListDto })
  getBooks() {
    return [];
  }
}
