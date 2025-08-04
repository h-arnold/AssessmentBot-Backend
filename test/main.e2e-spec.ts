import { ChildProcessWithoutNullStreams } from 'child_process';

import request from 'supertest';

import { startApp, stopApp, AppInstance } from './utils/app-lifecycle';

describe('Main App (E2E)', () => {
  let app: AppInstance;
  const logFilePath = '/tmp/e2e-test.log';

  beforeAll(async () => {
    app = await startApp(logFilePath);
  });

  afterAll(() => {
    stopApp(app.appProcess);
  });

  it('should return a greeting from the root endpoint', async () => {
    const response = await request(app.appUrl)
      .get('/')
      .set('Authorization', `Bearer ${app.apiKey}`);
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello World!');
  });
});
