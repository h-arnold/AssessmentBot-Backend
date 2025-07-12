import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import {
  CreateAssessorDto,
  TaskType,
} from './../src/v1/assessor/dto/create-assessor.dto';

describe('AssessorController (e2e-live)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let validApiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configService = moduleFixture.get<ConfigService>(ConfigService);

    // Retrieve API key from the ConfigService, which should be populated by .test.env
    const apiKeys = configService.get('API_KEYS');
    if (!apiKeys || apiKeys.length === 0) {
      throw new Error(
        'API_KEYS not found in config. Make sure .test.env is set up correctly.',
      );
    }
    validApiKey = apiKeys[0];

    const payloadLimit = configService.getGlobalPayloadLimit();
    app.use(json({ limit: payloadLimit }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/v1/assessor (POST) should return a valid assessment for a text task', async () => {
    const validPayload: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference:
        'The capital of the United Kingdom is London, a city with a rich and complex history.',
      template:
        'Identify the capital city mentioned in the text and briefly describe its significance.',
      studentResponse: 'The capital is London. It has a long history.',
    };

    const response = await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(validPayload)
      .expect(201);

    // Validate the structure of the live response
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('completeness');
    expect(typeof response.body.completeness.score).toBe('number');
    expect(typeof response.body.completeness.reasoning).toBe('string');

    expect(response.body).toHaveProperty('accuracy');
    expect(typeof response.body.accuracy.score).toBe('number');
    expect(typeof response.body.accuracy.reasoning).toBe('string');

    expect(response.body).toHaveProperty('spag');
    expect(typeof response.body.spag.score).toBe('number');
    expect(typeof response.body.spag.reasoning).toBe('string');
  }, 30000); // Increase timeout for live API call
});
