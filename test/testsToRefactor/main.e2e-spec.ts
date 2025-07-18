import { ChildProcessWithoutNullStreams } from 'child_process';

import request from 'supertest';

import { startApp, stopApp } from '../utils/e2e-test-utils';

describe('Main App (E2E)', () => {
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

  it('should return a greeting from the root endpoint', async () => {
    const response = await request(appUrl)
      .get('/')
      .set('Authorization', `Bearer ${apiKey}`);
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello World!');
  });
});
