import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod'
import { z } from 'zod/v4'
import { Logger } from '@nestjs/common';

enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

const PostSchema = z.object({
  title: z.string().describe('The title of the post'),
  content: z.string().describe('The content of the post'),
  authorId: z.number().describe('The ID of the author of the post'),
  visibility: z.nativeEnum(Visibility).describe('The visibility of the post'),
  nullableField: z.string().nullable().describe('A nullable field'),
})

class PostDto extends createZodDto(PostSchema) {}

class PostQueryParams extends createZodDto(z.object({
  title: z.string()
})) {}

@Controller('zod-v4/posts')
export class PostsController {
    private readonly logger = new Logger(PostsController.name);

    @Post()
    createPost(@Body() body: PostDto) {
        return body;
    }

    @Get()
    @ApiOkResponse({ type: [PostDto], description: 'Get all posts' })
    getAll(@Query() query: PostQueryParams) {
      this.logger.log('getAll', query);
      return [];
    }

    @Get(':id')
    @ZodSerializerDto(PostDto)
    @ApiOkResponse({ type: PostDto, description: 'Get a post by ID' })
    getById(@Param('id') id: string) {
      return {
        title: 'Hello',
        content: 'World',
        authorId: 1,
      };
    }
}
