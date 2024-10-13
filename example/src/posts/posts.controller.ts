import { Body, Controller, Post } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z';

class PostDto extends createZodDto(z.object({
  title: z.string(),
  content: z.string(),
})) {}

@Controller('posts')
export class PostsController {
    @Post()
    createPost(@Body() body: PostDto) {
        console.log(body);
        return body;
    }
}
