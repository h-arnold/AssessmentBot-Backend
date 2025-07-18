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
    const interval = setInterval(() => {
      const logs = getLogObjects(logFilePath);
      if (logs.some(predicate)) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
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
 * @returns An object containing the app process, base URL, and API key.
 * @throws If the application fails to start within 30 seconds.
 */
export async function startApp(logFilePath: string): Promise<{
  appProcess: ChildProcessWithoutNullStreams;
  appUrl: string;
  apiKey: string;
}> {
  if (fs.existsSync(logFilePath)) {
    fs.truncateSync(logFilePath, 0);
  }

  const mainJsPath = path.join(__dirname, '..', '..', 'dist', 'src', 'main.js');

  const appProcess = spawn('node', [mainJsPath], {
    cwd: path.join(__dirname, '..', '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: '3001',
      E2E_TESTING: 'true',
      LOG_FILE: logFilePath,
    },
  });

  const appUrl = 'http://localhost:3001';
  const apiKey = process.env.API_KEY || 'test-api-key';

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

  return { appProcess, appUrl, apiKey };
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
