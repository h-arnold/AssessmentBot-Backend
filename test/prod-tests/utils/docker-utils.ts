import { spawn } from 'child_process';
import http from 'http';

export interface CmdResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runCmd(
  cmd: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<CmdResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => {
      if (code === 0) resolve({ code: code ?? 0, stdout, stderr });
      else
        reject(
          new Error(
            `${cmd} ${args.join(' ')} failed (code ${code}):\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
          ),
        );
    });
  });
}

export async function waitForHttp(
  url: string,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            res.resume();
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(2000, () => req.destroy(new Error('timeout')));
      });
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `Service not ready at ${url} within ${timeoutMs}ms. Last error: ${lastErr}`,
  );
}
