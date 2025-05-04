import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../app.module';

describe('PostsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createApp();
  });

  test('POST /posts - should validate input using Zod', async () => {
    const validPost = {
      title: 'Test Post',
      content: 'This is a test post content.',
      authorId: 1
    };

    const invalidPost = {
      title: 'Test Post',
      content: 'This is a test post content.',
      authorId: 'not a number' // Should be a number
    };

    // Test with valid data
    await request(app.getHttpServer())
      .post('/posts')
      .send(validPost)
      .expect(201) // Assuming 201 is returned on successful creation
      .expect((res) => {
        expect(res.body).toEqual({
          title: validPost.title,
          content: validPost.content,
          authorId: validPost.authorId
        })
      });

    // Test with invalid data
    await request(app.getHttpServer())
      .post('/posts')
      .send(invalidPost)
      .expect(400) // Bad request due to validation failure
      .expect((res) => {
        expect(res.body).toEqual({
          statusCode: 400,
          message: 'Validation failed',
          errors: [
            {
              code: 'invalid_type',
              expected: 'number',
              received: 'string',
              path: ['authorId'],
              message: 'Expected number, received string'
            }
          ]
        });
      });
  });
});

async function createApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}
