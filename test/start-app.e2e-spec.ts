import * as fs from 'node:fs';
import * as path from 'node:path';

import { startApp } from './utils/app-lifecycle';

jest.setTimeout(30000);

describe('startApp integration', () => {
  const mainPath = path.resolve(process.cwd(), 'dist', 'src', 'main.js');
  const logsDir = path.join(__dirname, 'logs');
  const logFilePath = path.join(logsDir, 'start-app.e2e.log');

  beforeAll(() => {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });

  it('throws when built main.js is missing', async () => {
    if (!fs.existsSync(mainPath)) {
      throw new Error(
        `Expected built file at ${mainPath} to exist. Run 'npm run build' before running this test.`,
      );
    }

    const backup = `${mainPath}.bak`;

    try {
      fs.renameSync(mainPath, backup);
      await expect(startApp(logFilePath)).rejects.toThrow(
        /Built main file not found/,
      );
    } finally {
      // restore
      if (fs.existsSync(backup)) {
        fs.renameSync(backup, mainPath);
      }
    }
  });

  it('rejects when main.js exits immediately', async () => {
    if (!fs.existsSync(mainPath)) {
      throw new Error(
        `Expected built file at ${mainPath} to exist. Run 'npm run build' before running this test.`,
      );
    }

    const original = fs.readFileSync(mainPath, 'utf-8');
    try {
      // write a tiny script that exits immediately
      fs.writeFileSync(
        mainPath,
        "console.log('early-exit'); process.exit(0);\n",
        'utf-8',
      );

      await expect(startApp(logFilePath)).rejects.toThrow(
        /exited early|App process failed to start/,
      );
    } finally {
      // restore original
      fs.writeFileSync(mainPath, original, 'utf-8');
    }
  });
});
