import { ChildProcessWithoutNullStreams } from 'child_process';
import { readFileSync } from 'fs';

import request from 'supertest';

import {
  CreateAssessorDto,
  TaskType,
} from '../../src/v1/assessor/dto/create-assessor.dto';
import { startApp, stopApp } from '../utils/e2e-test-utils';

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
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  const logFilePath = '/workspaces/AssessmentBot-Backend/e2e-test.log';

  beforeAll(async () => {
    const app = await startApp(logFilePath);
    appProcess = app.appProcess;
    appUrl = app.appUrl;
    apiKey = app.apiKey;
  }, 10000);

  afterAll(() => {
    stopApp(appProcess);
  });

  it('/v1/assessor (POST) should return a valid assessment for a text task', async () => {
    const mappedPayload = {
      taskType: TaskType.TEXT,
      reference: textData.referenceTask,
      template: textData.emptyTask,
      studentResponse: textData.studentTask,
    };

    const response = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
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

    const response = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
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

    const response = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(imagePayload)
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty('completeness');
    expect(response.body).toHaveProperty('accuracy');
    expect(response.body).toHaveProperty('spag');
  }, 30000);
});
