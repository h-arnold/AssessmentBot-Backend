import * as fs from 'fs';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.test.env' });
import { json } from 'express';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import {
  CreateAssessorDto,
  TaskType,
} from './../src/v1/assessor/dto/create-assessor.dto';

// Helper function to load a file and convert it to a data URI
const loadFileAsDataURI = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType =
    path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
};

describe('AssessorController (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let validApiKey: string;

  // Load test data
  const textTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'textTask.json'), 'utf-8'),
  );
  const tableTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'tableTask.json'), 'utf-8'),
  );
  const imageTask = {
    taskType: TaskType.IMAGE,
    reference: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'referenceTask.png'),
    ),
    template: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'templateTask.png'),
    ),
    studentResponse: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'studentTask.png'),
    ),
  };

  beforeAll(async () => {
    // Environment variables are loaded from .test.env
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    configService = moduleFixture.get<ConfigService>(ConfigService);
    // Use log levels from config
    app.useLogger(configService.get('LOG_LEVEL'));
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

  describe('Auth and Validation', () => {
    it('/v1/assessor (POST) should return 401 Unauthorized when no API key is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .send(textTask)
        .expect(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('/v1/assessor (POST) should return 401 Unauthorized when an invalid API key is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', 'Bearer invalid-key')
        .send(textTask)
        .expect(401);
      expect(res.body.message).toBe('Invalid API key');
    });

    it('/v1/assessor (POST) should return 400 Bad Request for invalid DTO', async () => {
      const invalidPayload = { ...textTask, taskType: 'INVALID' };
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(invalidPayload)
        .expect(400);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  it('/v1/assessor (POST) should return 201 Created for valid DTO', async () => {
    const validPayload: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'test',
      template: 'test',
      studentResponse: 'test',
    };

    const res = await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(validPayload)
      .expect(201);
    expect(res.body).toHaveProperty('completeness');
    expect(res.body).toHaveProperty('accuracy');
    expect(res.body).toHaveProperty('spag');
  });
});
