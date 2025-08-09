import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

import { waitForLog } from './log-watcher';

/**
 * Represents the running application instance during E2E tests.
 */
export interface AppInstance {
  appProcess: ChildProcessWithoutNullStreams;
  appUrl: string;
  apiKey: string;
  apiKey2: string;
  throttlerTtl: number;
  unauthenticatedThrottlerLimit: number;
  authenticatedThrottlerLimit: number;
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
): Promise<AppInstance> {
  // Ensure the log directory exists to avoid permission or ENOENT errors
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  if (fs.existsSync(logFilePath)) {
    fs.truncateSync(logFilePath, 0);
  }

  const mainJsPath = path.join(__dirname, '..', '..', 'dist', 'src', 'main.js');

  // Load .test.env file
  const testEnvPath = path.join(__dirname, '..', '..', '.test.env');
  // Load .test.env if present; fall back to defaults otherwise
  const testEnvConfig = fs.existsSync(testEnvPath)
    ? dotenv.parse(fs.readFileSync(testEnvPath))
    : {};

  // Define default values for the test run.
  const defaultTestValues = {
    NODE_ENV: 'test',
    PORT: '3001',
    E2E_TESTING: 'true',
    LOG_FILE: logFilePath,
    GEMINI_API_KEY: 'dummy-key-for-testing', // Default dummy key
    API_KEYS: 'test-api-key,test-api-key-2',
    THROTTLER_TTL: '36000000',
    UNAUTHENTICATED_THROTTLER_LIMIT: '9',
    AUTHENTICATED_THROTTLER_LIMIT: '12',
  };

  // Merge environment variables: process.env < defaults < .test.env < overrides
  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...defaultTestValues,
    ...testEnvConfig,
    ...envOverrides,
  };

  const appProcess = spawn('node', [mainJsPath], {
    cwd: path.join(__dirname, '..', '..'),
    env: testEnv,
  });

  appProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  const appUrl = 'http://localhost:3001';

  try {
    await waitForLog(
      logFilePath,
      (log) =>
        typeof log.msg === 'string' &&
        log.msg.includes('Nest application successfully started'),
    );
  } catch (error) {
    console.error('Error during app startup:', error);
    // Ensure the process is killed if startup fails
    if (appProcess.pid) {
      appProcess.kill('SIGTERM');
    }
    throw error;
  }

  // Derive return values from the final, effective environment
  const [apiKey, apiKey2] = testEnv.API_KEYS!.split(',');

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
  if (appProcess && !appProcess.killed) {
    appProcess.kill('SIGTERM');
  }
}
