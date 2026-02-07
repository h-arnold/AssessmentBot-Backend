import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
  } else {
    // Touch the file to ensure it exists before pino/thread-stream opens it
    fs.closeSync(fs.openSync(logFilePath, 'a'));
  }

  const appEntryPath = path.join(
    __dirname,
    '..',
    '..',
    'dist',
    'src',
    'testing-main.js',
  );

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
    LOG_FILE: logFilePath,
    GEMINI_API_KEY: 'dummy-key-for-testing', // Default dummy key
    API_KEYS: 'test-api-key,test-api-key-2',
    THROTTLER_TTL: '36000000',
    UNAUTHENTICATED_THROTTLER_LIMIT: '9',
    AUTHENTICATED_THROTTLER_LIMIT: '12',
    LLM_BACKOFF_BASE_MS: '2000', // Increased backoff for rate limiting (2 seconds instead of 1)
    LLM_MAX_RETRIES: '5', // Increased retries for rate limiting (5 instead of 3)
    LOG_LEVEL: 'debug',
    ASSESSOR_CACHE_HASH_SECRET: 'test-assessor-cache-secret',
    ASSESSOR_CACHE_TTL_MINUTES: '1440',
    ASSESSOR_CACHE_MAX_SIZE_MIB: '384',
  };

  // Merge environment variables: process.env < defaults < .test.env < overrides
  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...defaultTestValues,
    ...testEnvConfig,
    ...envOverrides,
  };

  if (
    process.env.E2E_MOCK_LLM === 'true' ||
    process.env.E2E_MOCK_LLM === 'false'
  ) {
    testEnv.E2E_MOCK_LLM = process.env.E2E_MOCK_LLM;
  }

  if (testEnv.E2E_MOCK_LLM === 'true') {
    const shimPath = path.join(__dirname, 'llm-http-shim.cjs');
    const existingNodeOptions = testEnv.NODE_OPTIONS ?? '';
    const shimOption = `--require "${shimPath}"`;
    testEnv.NODE_OPTIONS = existingNodeOptions
      ? `${existingNodeOptions} ${shimOption}`
      : shimOption;
  }

  // Ensure the built test entrypoint exists before attempting to spawn the process
  if (!fs.existsSync(appEntryPath)) {
    throw new Error(
      `Built test entrypoint not found at ${appEntryPath}. Have you run a build?`,
    );
  }

  const appProcess = spawn('node', [appEntryPath], {
    cwd: path.join(__dirname, '..', '..'),
    env: testEnv,
  });

  const stderrListener = (data: Buffer): void => {
    console.error(`stderr: ${data}`);
  };
  appProcess.stderr.on('data', stderrListener);

  const appUrl = 'http://localhost:3001';

  // Create a promise that rejects if the child process exits or fails to spawn
  const earlyExitPromise = new Promise<never>((_, reject) => {
    const errorListener = (err: Error): void => {
      console.error('App process failed to start:', err);
      // Include any existing log content to aid debugging
      let logTail = '';
      try {
        if (fs.existsSync(logFilePath)) {
          const lc = fs.readFileSync(logFilePath, 'utf-8');
          logTail = lc.slice(-2000);
        }
      } catch (e) {
        logTail = `Failed to read log file: ${e instanceof Error ? e.message : String(e)}`;
      }
      reject(
        new Error(
          `App process failed to start: ${err?.message ?? String(err)}\n\nRecent log tail:\n${logTail}`,
        ),
      );
    };

    // Log stdout as well to capture any helpful messages
    const stdoutListener = (data: Buffer): void => {
      console.debug(`stdout: ${data}`);
    };
    appProcess.stdout.on('data', stdoutListener);

    const exitListener = (code: number | null, signal: string | null): void => {
      console.error(
        `App process exited early with code=${code} signal=${signal}`,
      );
      // Include any existing log content to aid debugging
      let logTail = '';
      try {
        if (fs.existsSync(logFilePath)) {
          const lc = fs.readFileSync(logFilePath, 'utf-8');
          logTail = lc.slice(-2000);
        }
      } catch (e) {
        logTail = `Failed to read log file: ${e instanceof Error ? e.message : String(e)}`;
      }
      reject(
        new Error(
          `App process exited early with code=${code} signal=${signal}\n\nRecent log tail:\n${logTail}`,
        ),
      );
    };

    appProcess.once('error', errorListener);
    appProcess.once('exit', exitListener);
  });

  // Use an AbortController so we can cancel the waiting poll if the process exits early
  const ac = new AbortController();

  try {
    // Race the log readiness check against early process exit so we fail fast with a helpful error
    await Promise.race([
      waitForLog(
        logFilePath,
        (log) =>
          typeof log.msg === 'string' &&
          log.msg.includes('Nest application successfully started'),
        30000,
        ac.signal,
      ),
      earlyExitPromise,
    ]);

    // Startup succeeded: remove the early-exit handlers and stdout/stderr listeners
    // (e.g. SIGTERM during test teardown) so they don't keep handles open.
    try {
      appProcess.removeAllListeners('error');
      appProcess.removeAllListeners('exit');
      appProcess.stdout.removeAllListeners('data');
      appProcess.stderr.removeAllListeners('data');
    } catch (err) {
      // Best-effort cleanup failed — log for diagnostics
      console.debug('Failed to remove listeners during startup cleanup:', err);
    }
  } catch (error) {
    // Abort the log poll if it's still running so timers are cleared promptly
    try {
      ac.abort();
    } catch (err) {
      // Log abort failure for visibility
      console.debug('Abort controller abort failed:', err);
    }

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
    throttlerTtl: Number.parseInt(testEnv.THROTTLER_TTL!),
    unauthenticatedThrottlerLimit: Number.parseInt(
      testEnv.UNAUTHENTICATED_THROTTLER_LIMIT!,
    ),
    authenticatedThrottlerLimit: Number.parseInt(
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
    try {
      appProcess.kill('SIGTERM');
    } catch (err) {
      // Log failure to send SIGTERM so flakes are easier to diagnose
      console.debug('Failed to send SIGTERM to app process:', err);
    }

    // If the process doesn't exit within a short timeout, force kill it to prevent
    // CI hangs due to orphaned processes.
    const killTimer = setTimeout(() => {
      try {
        if (!appProcess.killed) {
          appProcess.kill('SIGKILL');
        }
      } catch (err) {
        // Log force-kill failures for diagnostics
        console.debug('Failed to force-kill app process:', err);
      }
    }, 5000);

    appProcess.once('exit', () => clearTimeout(killTimer));
  }
}

export const API_CALL_DELAY_MS = 2000;

/**
 * Delays execution for a specified number of milliseconds.
 * Useful for rate limiting test API calls to avoid hitting Gemini API limits.
 *
 * @param ms - The number of milliseconds to delay.
 * @returns A Promise that resolves after the delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delays execution with periodic heartbeat logs to avoid silent test timeouts.
 *
 * @param ms - The number of milliseconds to delay.
 * @param heartbeatMs - Interval for heartbeat logs in milliseconds.
 * @param message - Optional heartbeat message prefix.
 * @returns A Promise that resolves after the delay.
 */
export function delayWithHeartbeat(
  ms: number,
  heartbeatMs = 15000,
  message = 'Heartbeat: waiting',
): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    const totalSeconds = Math.ceil(ms / 1000);

    const logHeartbeat = (): void => {
      const elapsedMs = Date.now() - startTime;
      const remainingMs = Math.max(ms - elapsedMs, 0);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      console.info(
        `${message} (${remainingSeconds}s remaining of ${totalSeconds}s).`,
      );
    };

    logHeartbeat();

    const interval = setInterval(logHeartbeat, heartbeatMs);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, ms);

    timeout.unref?.();
    interval.unref?.();
  });
}
