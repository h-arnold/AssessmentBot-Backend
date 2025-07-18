import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Define the LogObject interface
export interface LogObject {
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

export function getLogObjects(logFilePath: string): LogObject[] {
  const logContent = fs.readFileSync(logFilePath, 'utf-8');
  return logContent
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as LogObject);
}

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

export function stopApp(appProcess: ChildProcessWithoutNullStreams): void {
  console.info('Shutting down app...');
  if (appProcess) {
    appProcess.kill('SIGTERM');
  }
}
