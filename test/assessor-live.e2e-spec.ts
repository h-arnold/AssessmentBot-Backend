import { readFileSync } from 'fs';

import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import {
  CreateAssessorDto,
  TaskType,
} from './../src/v1/assessor/dto/create-assessor.dto';

// --- Synchronous Top-Level File Loading with Hardcoded Paths ---

const tableData = JSON.parse(
  readFileSync(
    '/workspaces/AssessmentBot-Backend/test/data/tableTask.json',
    'utf-8',
  ),
);
const textData = JSON.parse(
  readFileSync(
    '/workspaces/AssessmentBot-Backend/test/data/textTask.json',
    'utf-8',
  ),
);

// Load and encode image data
const referencePath =
  '/workspaces/AssessmentBot-Backend/test/ImageTasks/referenceTask.png';
const templatePath =
  '/workspaces/AssessmentBot-Backend/test/ImageTasks/templateTask.png';
const studentPath =
  '/workspaces/AssessmentBot-Backend/test/ImageTasks/studentTask.png';

const referenceDataUri = `data:image/png;base64,${readFileSync(
  referencePath,
).toString('base64')}`;
const templateDataUri = `data:image/png;base64,${readFileSync(
  templatePath,
).toString('base64')}`;
const studentDataUri = `data:image/png;base64,${readFileSync(
  studentPath,
).toString('base64')}`;

// --- Test Suite ---

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
    // Use console logger to ensure debug output is visible
    const logger = new ConsoleLogger();
    logger.setLogLevels(configService.get('LOG_LEVEL'));
    app.useLogger(logger);

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
    const mappedPayload = {
      taskType: TaskType.TEXT,
      reference: textData.referenceTask,
      template: textData.emptyTask,
      studentResponse: textData.studentTask,
    };

    const response = await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(mappedPayload)
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('completeness');
    expect(response.body).toHaveProperty('accuracy');
    expect(response.body).toHaveProperty('spag');
  }, 30000);

  it('/v1/assessor (POST) should return a valid assessment for a table task', async () => {
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

    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('completeness');
    expect(response.body).toHaveProperty('accuracy');
    expect(response.body).toHaveProperty('spag');
  }, 30000);

  it('/v1/assessor (POST) should return a valid assessment for an image task', async () => {
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

    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('completeness');
    expect(response.body).toHaveProperty('accuracy');
    expect(response.body).toHaveProperty('spag');
  }, 30000);
});
