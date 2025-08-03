import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a single log entry object parsed from the application's log file.
 * Contains request, response, error, and metadata fields.
 */
export interface LogObject {
  /**
   * Request information, if present.
   */
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
  /**
   * Response information, if present.
   */
  res?: {
    statusCode?: number;
    [key: string]: unknown;
  };
  /**
   * Time taken to process the request, in milliseconds.
   */
  responseTime?: number;
  /**
   * Log message string.
   */
  msg?: string;
  /**
   * Log level (number or string).
   */
  level?: number | string;
  /**
   * Error information, if present.
   */
  err?: {
    type?: string;
    message?: string;
    stack?: string;
    [key: string]: unknown;
  };
  /**
   * Timestamp of the log entry (epoch ms).
   */
  time?: number;
  /**
   * Any additional fields.
   */
  [key: string]: unknown;
}

/**
 * Reads a log file and parses each line as a LogObject.
 *
 * @param logFilePath - The path to the log file to read.
 * @returns An array of LogObject entries parsed from the file.
 */
export function getLogObjects(logFilePath: string): LogObject[] {
  const logContent = fs.readFileSync(logFilePath, 'utf-8');
  return logContent
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as LogObject);
}

/**
 * Waits until a log entry matching the given predicate appears in the log file, or times out after 30 seconds.
 *
 * @param logFilePath - The path to the log file to monitor.
 * @param predicate - A function that returns true for the desired log entry.
 * @throws If the timeout is reached before a matching log is found.
 */
export async function waitForLog(
  logFilePath: string,
  predicate: (log: LogObject) => boolean,
): Promise<void> {
  console.info(`Waiting for log with predicate: ${predicate.toString()}`);
  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout;

    const interval = setInterval(() => {
      const logs = getLogObjects(logFilePath);
      if (logs.some(predicate)) {
        clearInterval(interval);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);

    timeout = setTimeout(() => {
      clearInterval(interval);
      if (fs.existsSync(logFilePath)) {
        const logContent = fs.readFileSync(logFilePath, 'utf-8');
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

/**
 * Starts the application in a child process for E2E testing, waits for it to be ready, and returns process info.
 *
 * @param logFilePath - The path to the log file to use for the app process.
 * @param envOverrides - A plain JavaScript object to override default environment variables.
 * @returns An object containing the app process, base URL, and API key.
 * @throws If the application fails to start within 30 seconds.
 */
export async function startApp(
  logFilePath: string,
  envOverrides: Record<string, string> = {},
): Promise<{
  appProcess: ChildProcessWithoutNullStreams;
  appUrl: string;
  apiKey: string;
  apiKey2: string;
  throttlerTtl: number;
  unauthenticatedThrottlerLimit: number;
  authenticatedThrottlerLimit: number;
}> {
  if (fs.existsSync(logFilePath)) {
    fs.truncateSync(logFilePath, 0);
  }

  const mainJsPath = path.join(__dirname, '..', '..', 'dist', 'src', 'main.js');

  // Base environment setup
  const baseTestEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: '3001',
    E2E_TESTING: 'true',
    LOG_FILE: logFilePath,
  };

  // Provide a dummy key ONLY if a real one isn't already in the environment.
  // This allows live tests to run with a real key from .test.env,
  // while ensuring other tests can run in CI/CD without a real key.
  if (!baseTestEnv.GEMINI_API_KEY) {
    baseTestEnv.GEMINI_API_KEY = 'dummy-key-for-testing';
  }

  // Define default values for the test run.
  const defaultTestValues = {
    API_KEYS: 'test-api-key,test-api-key-2',
    THROTTLER_TTL: (process.env.THROTTLER_TTL || 36000000).toString(),
    UNAUTHENTICATED_THROTTLER_LIMIT: '9', // This seems to be the required limit for all the e2e tests to pass.
    AUTHENTICATED_THROTTLER_LIMIT: '12', // Add slightly more so that there is something of a difference between authenticated and unauthenticated request rate limits
  };

  // Combine base, defaults, and overrides
  const testEnv: NodeJS.ProcessEnv = {
    ...baseTestEnv,
    ...defaultTestValues,
    ...envOverrides,
  };

  const appProcess = spawn('node', [mainJsPath], {
    cwd: path.join(__dirname, '..', '..'),
    env: testEnv,
  });

  const appUrl = 'http://localhost:3001';

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error('App startup timed out'));
      }, 30000);

      const interval = setInterval(() => {
        if (fs.existsSync(logFilePath)) {
          const logContent = fs.readFileSync(logFilePath, 'utf-8');
          if (
            logContent.includes('"msg":"Nest application successfully started"')
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

  // Derive return values from the final, effective environment
  const [apiKey, apiKey2] = testEnv.API_KEYS!.split(',');

  // Return the values used in this specific test run
  return {
    appProcess,
    appUrl,
    apiKey,
    apiKey2,
    throttlerTtl: parseInt(testEnv.THROTTLER_TTL!),
    unauthenticatedThrottlerLimit: parseInt(
      testEnv.UNAUTHENTICATED_THROTTLER_LIMIT!,
    ),
    authenticatedThrottlerLimit: parseInt(
      testEnv.AUTHENTICATED_THROTTLER_LIMIT!,
    ),
  };
}

/**
 * Stops the running application process by sending SIGTERM.
 *
 * @param appProcess - The child process running the application.
 */
export function stopApp(appProcess: ChildProcessWithoutNullStreams): void {
  console.info('Shutting down app...');
  if (appProcess) {
    appProcess.kill('SIGTERM');
  }
}
