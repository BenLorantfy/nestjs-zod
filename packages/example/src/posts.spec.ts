import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';

describe.each([
  ['/zod-v3'],
  ['/zod-v4'],
])('%s', (path) => {
  describe('/posts', () => {
    let app: INestApplication;
  
    beforeEach(async () => {
      app = await createApp();
    });
  
    test('POST /posts - valies input with zod', async () => {
      const validPost = {
        title: 'Test Post',
        content: 'This is a test post content.',
        authorId: 1,
        visibility: 'public',
        // nullableField: null
      };
  
      const invalidPost = {
        title: 'Test Post',
        content: 'This is a test post content.',
        authorId: 'not a number', // Should be a number
        visibility: 'public',
        // nullableField: null
      };
  
      // Test with valid data
      await request(app.getHttpServer())
        .post(`${path}/posts`)
        .send(validPost)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            title: validPost.title,
            content: validPost.content,
            authorId: validPost.authorId,
            visibility: validPost.visibility,
            // nullableField: validPost.nullableField
          })
        });
  
      // Test with invalid data
      await request(app.getHttpServer())
        .post('/zod-v3/posts')
        .send(invalidPost)
        .expect(400) // Bad request due to validation failure
        .expect((res) => {
          expect(res.body).toEqual({
            statusCode: 400,
            message: 'Validation failed',
            errors: [
              expect.objectContaining({
                code: 'invalid_type',
                expected: 'number',
                path: ['authorId'],
                message: expect.stringContaining('xpected number, received string')
              })
            ]
          });
        });
    });

    test('GET /posts - validates query parameters with zod', async () => {
      const app = await createApp();

      // Test with valid query params
      await request(app.getHttpServer())
        .get(`${path}/posts`)
        .query({ title: 'Test Post' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([])
        });

      // Test with missing required query param
      await request(app.getHttpServer())
        .get(`${path}/posts`)
        .expect(400)
        .expect((res) => {
          expect(res.body).toEqual({
            statusCode: 400,
            message: 'Validation failed',
            errors: [
              expect.objectContaining({
                code: 'invalid_type',
                path: ['title'],
                message: expect.any(String)
              })
            ]
          });
        });
    });
  })
});

async function createApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}
