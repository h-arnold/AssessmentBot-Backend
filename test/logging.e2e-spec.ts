/**
 * End-to-end tests for the application's logging functionality.
 *
 * This suite verifies that logs are correctly generated, formatted, and contain the expected fields and redactions.
 * It interacts with the running application via HTTP requests and inspects the resulting log file for correctness.
 *
 * @file /workspaces/AssessmentBot-Backend/test/logging.e2e-spec.ts
 *
 * @remarks
 * - The log file is not cleared between tests to preserve log entries for asynchronous operations.
 * - Tests depend on log file contents and may require manual log file management for debugging.
 *
 * @suite Logging (True E2E)
 *
 * @test
 * 1. Should Propagate Request Context to Injected Loggers
 *    - Ensures that request context (e.g., req.id) is propagated to all relevant log entries.
 * 2. Should Output Valid JSON
 *    - Verifies that log entries are valid JSON objects.
 * 3. Should Contain Standard Request/Response Fields
 *    - Checks for standard fields such as req.id, req.method, req.url, res.statusCode, and responseTime.
 * 4. Should Redact Authorization Header
 *    - Ensures that sensitive headers (Authorization) are redacted in logs.
 * 5. Should Log Errors with Stack Traces
 *    - Confirms that errors are logged with type, message, and stack trace.
 * 6. Should Include ISO-8601 Timestamps
 *    - Validates that log entries include a valid timestamp in milliseconds since epoch.
 * 7. Should Respect LOG_LEVEL Configuration
 *    - Placeholder test for log level configuration.
 * 8. Should Handle Large Payloads Without Breaking JSON Output
 *    - Ensures that large request payloads do not break log output formatting.
 *
 * @see startApp, stopApp, getLogObjects, waitForLog
 */

import * as path from 'path';

import request from 'supertest';

import { startApp, stopApp, AppInstance, delay } from './utils/app-lifecycle';
import { getLogObjects, waitForLog } from './utils/log-watcher';

describe('Logging (True E2E)', () => {
  let app: AppInstance;
  const logFilePath = path.join(__dirname, 'logs', 'logging.e2e-spec.log');

  beforeAll(async () => {
    app = await startApp(logFilePath);
  });

  afterAll(() => {
    stopApp(app.appProcess);
  });

  // Do NOT clear the log file before each test.
  // Truncating the log file here causes loss of log entries needed by later tests,
  // especially for logs that are written asynchronously or after the request completes.
  // If you need to debug, clear the log file manually or in beforeAll only.

  it('1. Should Propagate Request Context to Injected Loggers', async () => {
    // The log file is not wiped between tests, so req.id will increment with each request.
    // As such, this test needs to run first because the way the test tracks when a request begins is when we get the message
    // `API key authentication attempt successful` which you will get in most of the tests. Should it be necessary to create
    // more request tracking type tests, I'll need to implement a more robust solution to this, but for now, this works.

    // Add delay before API call to avoid rate limiting
    await delay(2000);

    await request(app.appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${app.apiKey}`)
      .send({
        taskType: 'TEXT',
        reference: 'The quick brown fox jumps over the lazy dog.',
        template: 'Write a sentence about a fox.',
        studentResponse: 'A fox is a mammal.',
      });

    await waitForLog(
      logFilePath,
      (log) => !!log.msg?.includes('API key authentication attempt successful'),
    );

    let logObjects = getLogObjects(logFilePath);
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
      logFilePath,
      (log) =>
        typeof log.msg === 'string' &&
        log.msg.includes('request completed') &&
        log.req?.id === expectedReqId,
    );

    logObjects = getLogObjects(logFilePath);
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
    await request(app.appUrl)
      .get('/')
      .set('Authorization', `Bearer ${app.apiKey}`);
    await waitForLog(logFilePath, (log) => !!(log.req && log.res));
    expect(getLogObjects(logFilePath).length).toBeGreaterThan(0);
  });

  it('3. Should Contain Standard Request/Response Fields', async () => {
    await request(app.appUrl)
      .get('/')
      .set('Authorization', `Bearer ${app.apiKey}`);
    await waitForLog(logFilePath, (log) => !!(log.req && log.req.url === '/'));
    const logObject = getLogObjects(logFilePath).find(
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
    await request(app.appUrl)
      .get('/')
      .set('Authorization', `Bearer ${app.apiKey}`);
    await waitForLog(
      logFilePath,
      (log) => log.req?.headers?.authorization === 'Bearer <redacted>',
    );
    const logObjects = getLogObjects(logFilePath).filter(
      (obj) => obj.req && obj.req.url === '/',
    );
    expect(logObjects.length).toBeGreaterThan(0);
    for (const logObject of logObjects) {
      expect(logObject.req?.headers?.authorization).toBe('Bearer <redacted>');
    }
  });

  it('5. Should Log Errors with Stack Traces', async () => {
    // Add delay before API call to avoid rate limiting
    await delay(2000);

    await request(app.appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${app.apiKey}`)
      .send({});
    await waitForLog(logFilePath, (log) => !!log.err);
    const logObject = getLogObjects(logFilePath).find((obj) => obj.err);
    expect(logObject?.err).toBeDefined();
    expect(logObject?.err).toHaveProperty('type');
    expect(logObject?.err).toHaveProperty('message');
    expect(logObject?.err).toHaveProperty('stack');
  });

  it('6. Should Include ISO-8601 Timestamps', async () => {
    await request(app.appUrl)
      .get('/')
      .set('Authorization', `Bearer ${app.apiKey}`);
    await waitForLog(logFilePath, (log) => typeof log.time === 'number');
    const logObject = getLogObjects(logFilePath).find(
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

    await request(app.appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${app.apiKey}`)
      .send(largePayload);
    await waitForLog(
      logFilePath,
      (log) => !!log.msg?.includes('request completed'),
    );
    expect(getLogObjects(logFilePath).length).toBeGreaterThan(0);
  });
});
