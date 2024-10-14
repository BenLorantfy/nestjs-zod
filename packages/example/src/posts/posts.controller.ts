import { Body, Controller, Post } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

class PostDto extends createZodDto(z.object({
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The content of the post'),
})) {}

@Controller('posts')
export class PostsController {
    @Post()
    createPost(@Body() body: PostDto) {
        console.log(body);
        return body;
    }
}
