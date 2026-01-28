import * as fs from 'fs';
import * as path from 'path';

import { waitForLog } from './utils/log-watcher';

jest.setTimeout(5000);

describe('log-watcher', () => {
  const logsDir = path.join(__dirname, 'logs');
  const logFilePath = path.join(logsDir, 'waitForLog.unit.log');

  beforeAll(() => {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });

  it('is abortable via AbortSignal', async () => {
    const ac = new AbortController();
    const p = waitForLog(logFilePath, () => false, 3000, ac.signal);

    // Abort almost immediately
    ac.abort();

    await expect(p).rejects.toThrow(/waitForLog aborted/);
  });
});
