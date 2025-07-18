import { ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import request from 'supertest';

import {
  CreateAssessorDto,
  TaskType,
} from '../../src/v1/assessor/dto/create-assessor.dto';
import { startApp, stopApp } from '../utils/e2e-test-utils';

// Helper function to load a file and convert it to a data URI
const loadFileAsDataURI = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType =
    path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
};

describe('AssessorController (e2e)', () => {
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  const logFilePath = '/workspaces/AssessmentBot-Backend/e2e-test.log';

  // Load test data
  const textTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data', 'textTask.json'), 'utf-8'),
  );
  const tableTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data', 'tableTask.json'), 'utf-8'),
  );
  const imageTask = {
    taskType: TaskType.IMAGE,
    reference: loadFileAsDataURI(
      path.join(__dirname, '../ImageTasks', 'referenceTask.png'),
    ),
    template: loadFileAsDataURI(
      path.join(__dirname, '../ImageTasks', 'templateTask.png'),
    ),
    studentResponse: loadFileAsDataURI(
      path.join(__dirname, '../ImageTasks', 'studentTask.png'),
    ),
  };

  beforeAll(async () => {
    const app = await startApp(logFilePath);
    appProcess = app.appProcess;
    appUrl = app.appUrl;
    apiKey = app.apiKey;
  }, 10000);

  afterAll(() => {
    stopApp(appProcess);
  });

  describe('Auth and Validation', () => {
    it('/v1/assessor (POST) should return 401 Unauthorized when no API key is provided', async () => {
      const res = await request(appUrl)
        .post('/v1/assessor')
        .send(textTask)
        .expect(401);
      expect(res.body.message).toBe('Unauthorized');
    });

    it('/v1/assessor (POST) should return 401 Unauthorized when an invalid API key is provided', async () => {
      const res = await request(appUrl)
        .post('/v1/assessor')
        .set('Authorization', 'Bearer invalid-key')
        .send(textTask)
        .expect(401);
      expect(res.body.message).toBe('Invalid API key');
    });

    it('/v1/assessor (POST) should return 400 Bad Request for invalid DTO', async () => {
      const invalidPayload = { ...textTask, taskType: 'INVALID' };
      const res = await request(appUrl)
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${apiKey}`)
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

    const res = await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(validPayload)
      .expect(201);
    expect(res.body).toHaveProperty('completeness');
    expect(res.body).toHaveProperty('accuracy');
    expect(res.body).toHaveProperty('spag');
  });
});
