import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { ConfigService } from '../src/config/config.service';

describe('Throttler (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let apiKey: string;
  let apiKey2: string;
  let limit: number;
  let ttl: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    configService = app.get<ConfigService>(ConfigService);
    apiKey = configService.get('API_KEY');
    apiKey2 = configService.get('API_KEY_2');
    limit = configService.get('THROTTLER_LIMIT');
    ttl = configService.get('THROTTLER_TTL');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow requests below limit', async () => {
    const requests = Array(limit - 1)
      .fill(0)
      .map(() => {
        return request(app.getHttpServer())
          .post('/v1/assessor/text')
          .set('Authorization', `Bearer ${apiKey}`)
          .send({
            student_solution: 'The quick brown fox jumps over the lazy dog.',
            rubric: 'The student must use the word "fox".',
          })
          .expect(201);
      });
    await Promise.all(requests);
  });

  it('should reject requests exceeding limit', async () => {
    const requests = Array(limit)
      .fill(0)
      .map(() => {
        return request(app.getHttpServer())
          .post('/v1/assessor/text')
          .set('Authorization', `Bearer ${apiKey}`)
          .send({
            student_solution: 'The quick brown fox jumps over the lazy dog.',
            rubric: 'The student must use the word "fox".',
          })
          .expect(201);
      });
    await Promise.all(requests);

    return request(app.getHttpServer())
      .post('/v1/assessor/text')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        student_solution: 'The quick brown fox jumps over the lazy dog.',
        rubric: 'The student must use the word "fox".',
      })
      .expect(429);
  });

  it('should include Retry-After header on throttled response', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/assessor/text')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        student_solution: 'The quick brown fox jumps over the lazy dog.',
        rubric: 'The student must use the word "fox".',
      });

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(parseInt(response.headers['retry-after'], 10)).toBeGreaterThan(0);
  });

  it('should reset limit after TTL expires', async () => {
    await new Promise((resolve) => setTimeout(resolve, ttl * 1000));
    return request(app.getHttpServer())
      .post('/v1/assessor/text')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        student_solution: 'The quick brown fox jumps over the lazy dog.',
        rubric: 'The student must use the word "fox".',
      })
      .expect(201);
  });

  it('should throttle keys independently', async () => {
    const requests = Array(limit)
      .fill(0)
      .map(() => {
        return request(app.getHttpServer())
          .post('/v1/assessor/text')
          .set('Authorization', `Bearer ${apiKey}`)
          .send({
            student_solution: 'The quick brown fox jumps over the lazy dog.',
            rubric: 'The student must use the word "fox".',
          })
          .expect(201);
      });
    await Promise.all(requests);

    await request(app.getHttpServer())
      .post('/v1/assessor/text')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        student_solution: 'The quick brown fox jumps over the lazy dog.',
        rubric: 'The student must use the word "fox".',
      })
      .expect(429);

    return request(app.getHttpServer())
      .post('/v1/assessor/text')
      .set('Authorization', `Bearer ${apiKey2}`)
      .send({
        student_solution: 'The quick brown fox jumps over the lazy dog.',
        rubric: 'The student must use the word "fox".',
      })
      .expect(201);
  });

  it('should fallback to IP throttling if no key provided', async () => {
    const requests = Array(limit)
      .fill(0)
      .map(() => {
        return request(app.getHttpServer())
          .post('/v1/assessor/text')
          .send({
            student_solution: 'The quick brown fox jumps over the lazy dog.',
            rubric: 'The student must use the word "fox".',
          })
          .expect(401); // Unauthorized
      });
    await Promise.all(requests);

    return request(app.getHttpServer())
      .post('/v1/assessor/text')
      .send({
        student_solution: 'The quick brown fox jumps over the lazy dog.',
        rubric: 'The student must use the word "fox".',
      })
      .expect(429);
  });

  it.skip('should log throttled requests', async () => {
    // This test requires a more complex setup to capture and inspect logs.
    // It is skipped for now.
  });
});
