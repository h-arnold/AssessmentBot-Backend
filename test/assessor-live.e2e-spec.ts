import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';

import { getCurrentDirname } from '../src/common/file-utils';
import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import {
  CreateAssessorDto,
  TaskType,
} from './../src/v1/assessor/dto/create-assessor.dto';

interface TaskData {
  taskType: string;
  referenceTask: string;
  emptyTask: string;
  studentTask: string;
}

const currentDir = getCurrentDirname();
let tableData: TaskData;
let textData: TaskData;

describe('AssessorController (e2e-live)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let validApiKey: string;

  beforeAll(async () => {
    tableData = JSON.parse(
      fs.readFileSync(
        path.join(currentDir, 'test', 'data', 'tableTask.json'),
        'utf-8',
      ),
    );
    textData = JSON.parse(
      fs.readFileSync(
        path.join(currentDir, 'test', 'data', 'textTask.json'),
        'utf-8',
      ),
    );
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
      reference: textData.referenceTask,
      template: textData.emptyTask,
      studentResponse: textData.studentTask,
    };

    // Map JSON fields to DTO fields
    const mappedPayload = {
      taskType: validPayload.taskType,
      reference: textData.referenceTask,
      template: textData.emptyTask,
      studentResponse: textData.studentTask,
    };

    const response = await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(mappedPayload)
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

  it('/v1/assessor (POST) should return a valid assessment for a table task', async () => {
    // Map JSON fields to DTO fields
    const mappedPayload = {
      taskType: TaskType.TABLE,
      reference: tableData.referenceTask,
      template: tableData.emptyTask,
      studentResponse: tableData.studentTask,
    };

    const response = await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(mappedPayload)
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
  }, 30000);
  it('/v1/assessor (POST) should return a valid assessment for an image task', async () => {
    // Read and encode image files to base64 at runtime, then format as data URIs
    const referencePath = path.join(
      currentDir,
      'test',
      'ImageTasks',
      'referenceTask.png',
    );
    const templatePath = path.join(
      currentDir,
      'test',
      'ImageTasks',
      'templateTask.png',
    );
    const studentPath = path.join(
      currentDir,
      'test',
      'ImageTasks',
      'studentTask.png',
    );

    const referenceBase64 = fs.readFileSync(referencePath).toString('base64');
    const templateBase64 = fs.readFileSync(templatePath).toString('base64');
    const studentBase64 = fs.readFileSync(studentPath).toString('base64');

    const referenceDataUri = `data:image/png;base64,${referenceBase64}`;
    const templateDataUri = `data:image/png;base64,${templateBase64}`;
    const studentDataUri = `data:image/png;base64,${studentBase64}`;

    const imagePayload = {
      taskType: TaskType.IMAGE,
      reference: referenceDataUri,
      template: templateDataUri,
      studentResponse: studentDataUri,
    };

    const response = await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(imagePayload)
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
  }, 30000);
});
