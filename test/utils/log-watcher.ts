import * as fs from 'fs';

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
  if (!fs.existsSync(logFilePath)) {
    return [];
  }
  const logContent = fs.readFileSync(logFilePath, 'utf-8');
  return logContent
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as LogObject);
}

/**
 * Waits until a log entry matching the given predicate appears in the log file, or times out.
 *
 * @param logFilePath - The path to the log file to monitor.
 * @param predicate - A function that returns true for the desired log entry.
 * @param timeoutMs - The maximum time to wait in milliseconds.
 * @throws If the timeout is reached before a matching log is found.
 */
export async function waitForLog(
  logFilePath: string,
  predicate: (log: LogObject) => boolean,
  timeoutMs = 30000,
):
  Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkLog = () => {
      const logs = getLogObjects(logFilePath);
      if (logs.some(predicate)) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        if (fs.existsSync(logFilePath)) {
          const logContent = fs.readFileSync(logFilePath, 'utf-8');
          console.error(
            `waitForLog timed out. Log file contents (last 1000 chars):\n`,
            logContent.slice(-1000),
          );
        } else {
          console.error('waitForLog timed out. Log file does not exist.');
        }
        reject(new Error(`waitForLog timed out after ${timeoutMs}ms`));
        return;
      }

      setTimeout(checkLog, 100); // Poll every 100ms
    };

    checkLog();
  });
}