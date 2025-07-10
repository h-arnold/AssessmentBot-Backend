import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { ApiKeyGuard } from './../src/auth/api-key.guard';
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

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    assessorService = moduleFixture.get<AssessorService>(AssessorService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    validApiKey = (configService.get('API_KEYS') as string[])[0];

    const payloadLimit = configService.getGlobalPayloadLimit();
    app.use(json({ limit: payloadLimit }));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
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

    const createAssessmentSpy = jest.spyOn(assessorService, 'createAssessment');

    await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(validPayload)
      .expect(201)
      .then((res) => {
        expect(res.body).toEqual({
          message: 'Assessment created successfully',
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
