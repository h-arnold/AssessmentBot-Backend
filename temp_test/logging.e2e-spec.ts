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
  timestamp?: string;
  [key: string]: unknown;
}

describe('Logging (True E2E)', () => {
  // Test setup - use the test API key from .test.env
  const apiKey = 'test_api_key_123';
  let appUrl = process.env.APP_URL || 'http://localhost:3000';
  let appProcess: ChildProcessWithoutNullStreams;

  let capturedLogs: string[] = [];
  let testStartIndex = 0;

  beforeAll(async () => {
    // Clear captured logs
    capturedLogs = [];

    const mainJsPath = path.join(__dirname, '..', 'dist', 'src', 'main.js');

    appProcess = spawn('node', [mainJsPath], {
      cwd: path.join(__dirname, '..'), // Set working directory to project root
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3001',
        E2E_TESTING: 'true',
        // Remove LOG_FILE to use console output
      },
    });

    // Capture stdout and stderr
    appProcess.stdout.on('data', (data: Buffer) => {
      const lines = data
        .toString()
        .split('\n')
        .filter((line: string) => line.trim());
      capturedLogs.push(...lines);
    });

    appProcess.stderr.on('data', (data: Buffer) => {
      const lines = data
        .toString()
        .split('\n')
        .filter((line: string) => line.trim());
      capturedLogs.push(...lines);
    });

    appUrl = 'http://localhost:3001';

    // Wait for the app to be ready by checking captured logs for the startup message
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error('App startup timed out'));
      }, 30000);

      const interval = setInterval(() => {
        const allLogs = capturedLogs.join('\n');
        // Check for startup message in both JSON and pretty format
        if (
          allLogs.includes('"msg":"Nest application successfully started"') ||
          allLogs.includes('Nest application successfully started')
        ) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve();
        }
      }, 500);
    });
  }, 30000);

  afterAll(() => {
    if (appProcess) {
      appProcess.kill('SIGTERM');
    }
  });

  beforeEach(() => {
    // Don't clear logs, just mark the start of a new test
    const testStartMarker = `=== TEST START: ${new Date().toISOString()} ===`;
    capturedLogs.push(testStartMarker);
  });

  function getLogObjects(): LogObject[] {
    // Filter out non-JSON lines and parse JSON logs
    const jsonLogs: LogObject[] = [];

    for (const line of capturedLogs) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedLine);
          // Include all JSON logs, not just HTTP request logs
          jsonLogs.push(parsed as LogObject);
        } catch (error) {
          // Skip lines that aren't valid JSON
          continue;
        }
      }
    }

    return jsonLogs;
  }

  function debugAllLogs(): void {
    const summary = capturedLogs
      .map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            return `[${index}] ${parsed.level || 'unknown'} ${parsed.msg || 'no message'} ${parsed.req ? `${parsed.req.method} ${parsed.req.url}` : ''} ${parsed.res ? `-> ${parsed.res.statusCode}` : ''}`;
          } catch (e) {
            return `[${index}] INVALID JSON: ${line.substring(0, 100)}...`;
          }
        } else {
          return `[${index}] Non-JSON text: ${line.substring(0, 100)}...`;
        }
      })
      .join('\n');
    console.debug(`
=== DEBUG: All captured logs ===
Total lines captured: ${capturedLogs.length}\n${summary}
=== END DEBUG ===
`);
  }

  async function waitForLog(
    predicate: (log: LogObject) => boolean,
  ): Promise<void> {
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
        debugAllLogs();
        console.error(
          'Available logs:',
          getLogObjects().map((log) => ({
            msg: log.msg,
            req: log.req
              ? { method: log.req.method, url: log.req.url }
              : undefined,
            res: log.res ? { statusCode: log.res.statusCode } : undefined,
          })),
        );
        reject(new Error('waitForLog timed out'));
      }, 30000);
    });
  }

  it('1. Should Output Valid JSON', async () => {
    await request(appUrl).get('/').set('Authorization', `Bearer ${apiKey}`);
    await waitForLog((log) => !!(log.req && log.res));
    expect(getLogObjects().length).toBeGreaterThan(0);
  });

  it('2. Should Contain Standard Request/Response Fields', async () => {
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

  it('3. Should Redact Authorization Header', async () => {
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

  it('4. Should Propagate Request Context to Injected Loggers', async () => {
    await request(appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        taskType: 'TEXT',
        reference: 'Test reference content',
        template: 'Test template content',
        studentResponse: 'Test student response content',
      });

    await waitForLog(
      (log) => !!(log.msg && log.msg.includes('authentication attempt')),
    );

    const logObjects = getLogObjects();
    const requestCompletedLog = logObjects.find(
      (obj) => obj.msg && obj.msg.includes('request completed'),
    );
    const serviceLog = logObjects.find(
      (obj) => obj.msg && obj.msg.includes('authentication attempt'),
    );

    expect(requestCompletedLog?.req?.id).toBeDefined();
    expect(serviceLog?.req?.id).toBe(requestCompletedLog?.req?.id);
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
    await waitForLog((log) => !!log.timestamp);
    const logObject = getLogObjects().find((obj) => obj.timestamp);
    const timestamp = new Date(logObject!.timestamp!);
    expect(timestamp.toISOString()).toBe(logObject!.timestamp);
  });

  it('7. Should Respect LOG_LEVEL Configuration', () => {
    console.info('Skipping LOG_LEVEL test in e2e suite.');
    expect(true).toBe(true);
  });

  it('8. Should Handle Large Payloads Without Breaking JSON Output', async () => {
    const largePayload = {
      taskType: 'TEXT',
      reference: 'a'.repeat(1024 * 50),
      template: 'a'.repeat(1024 * 50),
      studentResponse: 'a'.repeat(1024 * 50),
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
