import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

class PostDto extends createZodDto(z.object({
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The content of the post'),
  authorId: z.number().describe('The ID of the author of the post'),
})) {}

@Controller('posts')
export class PostsController {
    @Post()
    createPost(@Body() body: PostDto) {
        return body;
    }

    @Get()
    @ApiOkResponse({ type: [PostDto], description: 'Get all posts' })
    getAll() {
      return [];
    }

    @Get(':id')
    @ApiOkResponse({ type: PostDto, description: 'Get a post by ID' })
    getById(@Param('id') id: string) {
      return {
        title: 'Hello',
        content: 'World',
        authorId: 1,
      };
    }
}
