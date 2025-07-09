import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Authentication (e2e)', () => {
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

  describe('Protected Routes', () => {
    it('should return 401 Unauthorized when no API key is provided', () => {
      return request(app.getHttpServer()).get('/protected').expect(401);
    });

    it('should return 401 Unauthorized when an invalid API key is provided', () => {
      return request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', 'Bearer invalid-key')
        .expect(401);
    });

    it('should return 200 OK when a valid API key is provided', () => {
      // This test will fail until the Green Phase
      process.env.API_KEYS = 'valid-key';
      return request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', 'Bearer valid-key')
        .expect(200);
    });

    it('should return 401 Unauthorized for a malformed Authorization header', () => {
      return request(app.getHttpServer())
        .get('/protected')
        .set('Authorization', 'invalid-format')
        .expect(401);
    });
  });

  describe('Unprotected Routes', () => {
    it('/health endpoint should be accessible without authentication', () => {
      return request(app.getHttpServer()).get('/health').expect(200);
    });
  });
});
