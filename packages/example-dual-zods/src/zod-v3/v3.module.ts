import { Module } from '@nestjs/common';
import { PostsController } from './posts/posts.controller';

@Module({
  controllers: [PostsController]
})
export class V3Module {}
