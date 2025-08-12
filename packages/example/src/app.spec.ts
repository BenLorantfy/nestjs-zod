import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import request from 'supertest';

let app: INestApplication;

beforeEach(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();
});

afterEach(async () => {
  await app.close();
});

describe('GET /api/people', () => {
  it('should return a list of people', () => {
    return request(app.getHttpServer())
      .get('/api/people')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
      });
  });
});