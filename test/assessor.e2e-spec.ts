import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import { AssessorService } from './../src/v1/assessor/assessor.service';
import {
  CreateAssessorDto,
  TaskType,
} from './../src/v1/assessor/dto/create-assessor.dto';

describe('AssessorController (e2e)', () => {
  let app: INestApplication;
  let assessorService: AssessorService;
  let configService: ConfigService;
  let validApiKey: string;
  let createAssessmentSpy: jest.SpyInstance;

  beforeEach(async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    assessorService = moduleFixture.get<AssessorService>(AssessorService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    validApiKey = (configService.get('API_KEYS') as string[])[0];

    const mockLlmResponse = {
      completeness: { score: 5, reasoning: 'Perfect' },
      accuracy: { score: 4, reasoning: 'Good' },
      spag: { score: 3, reasoning: 'Okay' },
    };

    createAssessmentSpy = jest
      .spyOn(assessorService, 'createAssessment')
      .mockResolvedValue(mockLlmResponse);

    const payloadLimit = configService.getGlobalPayloadLimit();
    app.use(json({ limit: payloadLimit }));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Image Validation', () => {
    const validPngBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const validJpegBase64 =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ACoAB//Z';

    it('should accept a valid PNG base64 image', async () => {
      const payload = {
        taskType: TaskType.IMAGE,
        reference: validPngBase64,
        template: validPngBase64,
        studentResponse: validPngBase64,
      };
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(payload)
        .expect(201);
      expect(res.status).toBe(201);
    });

    it('should accept a valid JPEG base64 image', async () => {
      const payload = {
        taskType: TaskType.IMAGE,
        reference: validJpegBase64,
        template: validJpegBase64,
        studentResponse: validJpegBase64,
      };
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(payload)
        .expect(201);
      expect(res.status).toBe(201);
    });

    it('should reject a GIF base64 image (disallowed type)', async () => {
      const gifBase64 =
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const payload = {
        taskType: TaskType.IMAGE,
        reference: gifBase64,
        template: gifBase64,
        studentResponse: gifBase64,
      };
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('should reject a PNG image exceeding size limit', async () => {
      const largePng =
        'data:image/png;base64,' +
        Buffer.alloc(6 * 1024 * 1024).toString('base64');
      const payload = {
        taskType: TaskType.IMAGE,
        reference: largePng,
        template: largePng,
        studentResponse: largePng,
      };
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(payload);
      expect(res.status).toBe(413);
    });

    it('should reject an invalid base64 image string', async () => {
      const invalidBase64 = 'data:image/png;base64,not-a-base64-string';
      const payload = {
        taskType: TaskType.IMAGE,
        reference: invalidBase64,
        template: invalidBase64,
        studentResponse: invalidBase64,
      };
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('should reject an empty base64 image string', async () => {
      const emptyBase64 = 'data:image/png;base64,';
      const payload = {
        taskType: TaskType.IMAGE,
        reference: emptyBase64,
        template: emptyBase64,
        studentResponse: emptyBase64,
      };
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });
  });

  it('/v1/assessor (POST) should return 401 Unauthorized when no API key is provided', async () => {
    await request(app.getHttpServer())
      .post('/v1/assessor')
      .send({
        taskType: TaskType.TEXT,
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
      })
      .expect(401)
      .then((res) => {
        expect(res.body.message).toBe('Unauthorized');
      });
  });

  it('/v1/assessor (POST) should return 401 Unauthorized when an invalid API key is provided', async () => {
    await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', 'Bearer invalid-key')
      .send({
        taskType: TaskType.TEXT,
        reference: 'test',
        template: 'test',
        studentResponse: 'test',
      })
      .expect(401)
      .then((res) => {
        expect(res.body.message).toBe('Invalid API key');
      });
  });

  it('/v1/assessor (POST) should return 400 Bad Request for invalid DTO', async () => {
    const invalidPayload = {
      taskType: 'INVALID', // Invalid taskType
      reference: 'test',
      template: 'test',
      studentResponse: 'test',
    };
    await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(invalidPayload)
      .expect(400)
      .then((res) => {
        expect(res.body.message).toBe('Validation failed');
      });
  });

  it('/v1/assessor (POST) should return 201 Created for valid DTO and call service', async () => {
    const validPayload: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'test',
      template: 'test',
      studentResponse: 'test',
    };

    await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(validPayload)
      .expect(201)
      .then((res) => {
        expect(res.body).toEqual({
          completeness: { score: 5, reasoning: 'Perfect' },
          accuracy: { score: 4, reasoning: 'Good' },
          spag: { score: 3, reasoning: 'Okay' },
        });
      });

    expect(createAssessmentSpy).toHaveBeenCalledTimes(1);
    expect(createAssessmentSpy).toHaveBeenCalledWith(validPayload);
  });

  it('POST /v1/assessor with payload exceeding global limit should return 413 Payload Too Large', async () => {
    const largePayload = {
      taskType: TaskType.TEXT,
      reference: 'a'.repeat(6 * 1024 * 1024), // 6MB string
      template: 'test',
      studentResponse: 'test',
    };

    const response = await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(largePayload);
    expect(response.status).toBe(413);
  });
});
