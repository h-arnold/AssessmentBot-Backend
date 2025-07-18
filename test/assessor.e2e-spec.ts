import { ChildProcessWithoutNullStreams } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

import request from 'supertest';

import {
  CreateAssessorDto,
  TaskType,
} from '../../src/v1/assessor/dto/create-assessor.dto';
import { startApp, stopApp } from '../utils/e2e-test-utils';

// Helper function to load a file and convert it to a data URI
const loadFileAsDataURI = async (filePath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  const mimeType =
    path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
};

describe('AssessorController (e2e)', () => {
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  const logFilePath = '/workspaces/AssessmentBot-Backend/e2e-test.log';

  let textTask: CreateAssessorDto;
  let tableTask: CreateAssessorDto;
  let imageTask: CreateAssessorDto;

  beforeAll(async () => {
    const app = await startApp(logFilePath);
    appProcess = app.appProcess;
    appUrl = app.appUrl;
    apiKey = app.apiKey;

    // Load test data asynchronously
    const dataDir = path.join(__dirname, '../data');
    const imageDir = path.join(__dirname, '../ImageTasks');

    const textTaskPath = path.join(dataDir, 'textTask.json');
    const tableTaskPath = path.join(dataDir, 'tableTask.json');

    textTask = JSON.parse(await fs.readFile(textTaskPath, 'utf-8'));
    tableTask = JSON.parse(await fs.readFile(tableTaskPath, 'utf-8'));

    imageTask = {
      taskType: TaskType.IMAGE,
      reference: await loadFileAsDataURI(
        path.join(imageDir, 'referenceTask.png'),
      ),
      template: await loadFileAsDataURI(
        path.join(imageDir, 'templateTask.png'),
      ),
      studentResponse: await loadFileAsDataURI(
        path.join(imageDir, 'studentTask.png'),
      ),
    };
  }, 20000); // Increased timeout for file loading

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
