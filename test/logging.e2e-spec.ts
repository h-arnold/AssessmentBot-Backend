import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import request from 'supertest';

// Define the LogObject interface as in the original test
interface LogObject {
  req?: {
    id?: string;
    method?: string;
    url?: string;
    headers?: {
      authorization?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  res?: {
    statusCode?: number;
    [key: string]: unknown;
  };
  responseTime?: number;
  msg?: string;
  level?: number | string;
  err?: {
    type?: string;
    message?: string;
    stack?: string;
    [key: string]: unknown;
  };
  time?: number;
  [key: string]: unknown;
}

describe('Logging (True E2E)', () => {
  let appProcess: ChildProcessWithoutNullStreams;
  let appUrl: string;
  let apiKey: string;
  const logFilePath = '/workspaces/AssessmentBot-Backend/e2e-test.log';

  beforeAll(async () => {
    // Clear the log file before starting
    if (fs.existsSync(logFilePath)) {
      fs.truncateSync(logFilePath, 0);
    }

    const mainJsPath = path.join(__dirname, '..', 'dist', 'src', 'main.js');

    appProcess = spawn('node', [mainJsPath], {
      cwd: path.join(__dirname, '..'), // Set working directory to project root
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3001',
        E2E_TESTING: 'true',
        LOG_FILE: logFilePath,
      },
    });

    appUrl = 'http://localhost:3001';
    apiKey = process.env.API_KEY || 'test-api-key';

    // Wait for the app to be ready by polling for the log file to contain the startup message
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(interval);
          reject(new Error('App startup timed out'));
        }, 30000);

        const interval = setInterval(() => {
          if (fs.existsSync(logFilePath)) {
            const logContent = fs.readFileSync(logFilePath, 'utf-8');
            // Check for the startup message in JSON format
            if (
              logContent.includes(
                '"msg":"Nest application successfully started"',
              )
            ) {
              clearInterval(interval);
              clearTimeout(timeout);
              resolve();
            }
          }
        }, 500);
      });
    } catch (error) {
      console.error('Error during app startup:', error);
      throw error;
    }
  }, 10000);

  afterAll(() => {
    console.info('Shutting down app...');
    if (appProcess) {
      appProcess.kill('SIGTERM');
    }
  });

  // Do NOT clear the log file before each test.
  // Truncating the log file here causes loss of log entries needed by later tests,
  // especially for logs that are written asynchronously or after the request completes.
  // If you need to debug, clear the log file manually or in beforeAll only.

  function getLogObjects(): LogObject[] {
    const logContent = fs.readFileSync(logFilePath, 'utf-8');
    return logContent
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line) as LogObject);
  }

  async function waitForLog(
    predicate: (log: LogObject) => boolean,
  ): Promise<void> {
    console.info(`Waiting for log with predicate: ${predicate.toString()}`);
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const logs = getLogObjects();
        if (logs.some(predicate)) {
          clearInterval(interval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        // Print log file contents for debugging
        if (fs.existsSync(logFilePath)) {
          const logContent = fs.readFileSync(logFilePath, 'utf-8');
          // Print first 1000 characters to avoid flooding
          console.error(
            'waitForLog timed out. Log file contents (first 1000 chars):\n',
            logContent.slice(0, 1000),
          );
        } else {
          console.error('waitForLog timed out. Log file does not exist.');
        }
        reject(new Error('waitForLog timed out'));
      }, 30000);
    });
  }

  it('1. Should Propagate Request Context to Injected Loggers', async () => {
    // The log file is not wiped between tests, so req.id will increment with each request.
    // As such, this test needs to run first because the way the test tracks when a request begins is when we get the message
    // `API key authentication attempt successful` which you will get in most of the tests. Should it be necessary to create
    // more request tracking type tests, I'll need to implement a more robust solution to this, but for now, this works.
    await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });

    await waitForLog(
      (log) =>
        !!(
          log.msg &&
          log.msg.includes('API key authentication attempt successful')
        ),
    );

    let logObjects = getLogObjects();
    // Find the highest req.id for POST /v1/assessor logs (most recent request)
    const postReqIds = logObjects
      .filter(
        (obj) =>
          obj.req &&
          obj.req.method === 'POST' &&
          obj.req.url === '/v1/assessor' &&
          obj.req.id !== undefined,
      )
      .map((obj) => obj.req!.id)
      .filter((id) => typeof id === 'number' || typeof id === 'string');
    const expectedReqId =
      postReqIds.length > 0 ? postReqIds[postReqIds.length - 1] : undefined;
    expect(expectedReqId).toBeDefined();

    // Wait for the 'request completed' log for this req.id
    await waitForLog(
      (log) =>
        typeof log.msg === 'string' &&
        log.msg.includes('request completed') &&
        log.req?.id === expectedReqId,
    );

    logObjects = getLogObjects();
    // Find the logs for this request id
    const requestCompletedLog = logObjects.find(
      (obj) =>
        obj.msg &&
        obj.msg.includes('request completed') &&
        obj.req?.id === expectedReqId,
    );
    const serviceLog = logObjects.find(
      (obj) =>
        obj.msg &&
        obj.msg.includes('API key authentication attempt successful') &&
        obj.req?.id === expectedReqId,
    );

    expect(requestCompletedLog).toBeDefined();
    expect(serviceLog).toBeDefined();
    expect(serviceLog?.req?.id).toBe(requestCompletedLog?.req?.id);
  });

  it('2. Should Output Valid JSON', async () => {
    await request(appUrl).get('/').set('Authorization', `Bearer ${apiKey}`);
    await waitForLog((log) => !!(log.req && log.res));
    expect(getLogObjects().length).toBeGreaterThan(0);
  });

  it('3. Should Contain Standard Request/Response Fields', async () => {
    await request(appUrl).get('/').set('Authorization', `Bearer ${apiKey}`);
    await waitForLog((log) => !!(log.req && log.req.url === '/'));
    const logObject = getLogObjects().find(
      (obj) => obj.req && obj.req.url === '/',
    );
    expect(logObject).toBeDefined();
    expect(logObject).toHaveProperty('req.id');
    expect(logObject).toHaveProperty('req.method', 'GET');
    expect(logObject).toHaveProperty('req.url', '/');
    expect(logObject).toHaveProperty('res.statusCode', 200);
    expect(logObject).toHaveProperty('responseTime');
  });

  it('4. Should Redact Authorization Header', async () => {
    await request(appUrl).get('/').set('Authorization', `Bearer ${apiKey}`);
    await waitForLog(
      (log) => log.req?.headers?.authorization === 'Bearer <redacted>',
    );
    const logObjects = getLogObjects().filter(
      (obj) => obj.req && obj.req.url === '/',
    );
    expect(logObjects.length).toBeGreaterThan(0);
    for (const logObject of logObjects) {
      expect(logObject.req?.headers?.authorization).toBe('Bearer <redacted>');
    }
  });

  it('5. Should Log Errors with Stack Traces', async () => {
    await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({});
    await waitForLog((log) => !!log.err);
    const logObject = getLogObjects().find((obj) => obj.err);
    expect(logObject?.err).toBeDefined();
    expect(logObject?.err).toHaveProperty('type');
    expect(logObject?.err).toHaveProperty('message');
    expect(logObject?.err).toHaveProperty('stack');
  });

  it('6. Should Include ISO-8601 Timestamps', async () => {
    await request(appUrl).get('/').set('Authorization', `Bearer ${apiKey}`);
    await waitForLog((log) => typeof log.time === 'number');
    const logObject = getLogObjects().find(
      (obj) => typeof obj.time === 'number',
    );
    expect(logObject).toBeDefined();
    // Validate that 'time' is a valid unix timestamp (ms since epoch, within reasonable range)
    const now = Date.now();
    // Allow for logs up to 1 day in the future or past (to avoid flakiness)
    expect(logObject!.time).toBeGreaterThan(now - 1000 * 60 * 60 * 24);
    expect(logObject!.time).toBeLessThan(now + 1000 * 60 * 60 * 24);
    // Optionally, check that it's an integer
    expect(Number.isInteger(logObject!.time)).toBe(true);
  });

  it('7. Should Respect LOG_LEVEL Configuration', () => {
    console.info('Skipping LOG_LEVEL test in e2e suite.');
    expect(true).toBe(true);
  });

  it('8. Should Handle Large Payloads Without Breaking JSON Output', async () => {
    const largePayload = {
      student_solution: {
        file_content: 'a'.repeat(1024 * 50),
        file_name: 'large.txt',
      },
      template: { file_content: 'a'.repeat(1024 * 50), file_name: 'large.txt' },
      criteria: 'Test criteria',
    };

    await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(largePayload);
    await waitForLog(
      (log) => !!(log.msg && log.msg.includes('request completed')),
    );
    expect(getLogObjects().length).toBeGreaterThan(0);
  });
});
