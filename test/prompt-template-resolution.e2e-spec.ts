import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { getCurrentDirname } from 'src/common/file-utilities';

/**
 * This suite lives in the E2E project rather than the unit project because it
 * inspects the compiled output: it requires `dist/` to exist, and
 * `npm run test:e2e` guarantees that by running `npm run build` first. It
 * deliberately starts no server and does not boot the Nest application.
 *
 * POSIX assumption: the production-layout simulation relies on a directory
 * symlink and an absolute-path `import()`, both of which behave as required on
 * the Linux/Docker targets this project deploys to. No Windows fallback or
 * platform-detection branch is provided.
 */

/**
 * The repository root the compiled output and source templates resolve against.
 */
const repositoryRoot = getCurrentDirname();

/**
 * The repository's own prompt templates directory. Template names are discovered
 * from here so a template added later is covered automatically.
 */
const sourceTemplatesDirectory = path.join(
  repositoryRoot,
  'src',
  'prompt',
  'templates',
);

/**
 * The prompt template file names currently shipped in the repository.
 */
const templateEntries = await fs.readdir(sourceTemplatesDirectory);
const templateNames = templateEntries
  .filter((name) => name.endsWith('.md'))
  .toSorted((a, b) => a.localeCompare(b));

/**
 * Bounded time the simulated production child process may run before it is
 * killed, so a hung child cannot leave a stray process or stall the suite.
 */
const resolutionTimeoutMs = 15_000;

/**
 * Inline ESM script executed with the simulated production root as its working
 * directory.
 *
 * The absolute path to the compiled `file-utilities.js` and the template names
 * are supplied through environment variables so nothing is string-interpolated
 * into the evaluated code.
 */
const resolutionScript = `
const fileUtilities = await import(process.env.PROMPT_FILE_UTILITIES_PATH);
const names = JSON.parse(process.env.PROMPT_TEMPLATE_NAMES);
const contents = {};
for (const name of names) {
  contents[name] = await fileUtilities.readMarkdown(name);
}
process.stdout.write(JSON.stringify(contents));
`;

/**
 * Captured outcome of the simulated production child process.
 */
interface ChildProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Parses the child's stdout as the JSON map of template names to contents,
 * converting a malformed stdout into a diagnosable assertion failure rather
 * than a raw `SyntaxError`.
 * @param {ChildProcessResult} result - The captured child process outcome.
 * @returns {Record<string, string>} The parsed template contents keyed by name.
 */
function parseResolvedContents(
  result: ChildProcessResult,
): Record<string, string> {
  try {
    return JSON.parse(result.stdout) as Record<string, string>;
  } catch (error: unknown) {
    throw new Error(
      `Prompt resolution child did not emit parsable JSON on stdout. ` +
        `stdout: ${result.stdout} | stderr: ${result.stderr}`,
      { cause: error },
    );
  }
}

/**
 * Runs `readMarkdown` inside the simulated production root and captures the
 * child process output.
 *
 * The child's working directory is the throwaway root, so the first candidate
 * path (`src/prompt/templates`) cannot resolve to the repository source and the
 * only way to reach the templates is through the shipped `dist` directory.
 *
 * The child is invoked through `process.execPath`, so its environment is
 * narrowed to only the two variables this script reads; nothing else from the
 * ambient environment (including `PATH`) is required.
 * @param {string} productionRoot - The throwaway root mirroring the production
 *   image layout.
 * @param {readonly string[]} names - The template file names to resolve.
 * @returns {Promise<ChildProcessResult>} The child exit code and captured
 *   output.
 */
function runProductionResolution(
  productionRoot: string,
  names: readonly string[],
): Promise<ChildProcessResult> {
  const fileUtilitiesPath = path.join(
    productionRoot,
    'dist',
    'src',
    'common',
    'file-utilities.js',
  );

  return new Promise<ChildProcessResult>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--input-type=module', '-e', resolutionScript],
      {
        cwd: productionRoot,
        env: {
          PROMPT_FILE_UTILITIES_PATH: fileUtilitiesPath,
          PROMPT_TEMPLATE_NAMES: JSON.stringify(names),
        },
      },
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, resolutionTimeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new Error(
            `Prompt resolution child process timed out after ` +
              `${resolutionTimeoutMs}ms and was killed ` +
              `(signal: ${signal === null ? 'none' : signal}). stderr: ${stderr}`,
          ),
        );
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

describe('Production prompt-template resolution (e2e)', () => {
  const compiledRoot = path.join(repositoryRoot, 'dist');
  const compiledTemplatesDirectory = path.join(
    compiledRoot,
    'src',
    'prompt',
    'templates',
  );
  const doubledTemplatesDirectory = path.join(
    compiledRoot,
    'src',
    'src',
    'prompt',
    'templates',
  );

  let productionRoot: string | undefined;

  afterAll(async () => {
    if (productionRoot !== undefined) {
      await fs.rm(productionRoot, { recursive: true, force: true });
    }
  });

  describe('Compiled asset layout', () => {
    it('should discover at least one source prompt template to exercise', () => {
      expect(templateNames.length).toBeGreaterThan(0);
    });

    it.each(templateNames)(
      'should copy %s into dist/src/prompt/templates',
      async (name) => {
        await expect(
          fs.access(path.join(compiledTemplatesDirectory, name)),
        ).resolves.toBeUndefined();
      },
    );

    it('should not copy prompt templates into the doubled dist/src/src/prompt/templates directory', async () => {
      await expect(fs.access(doubledTemplatesDirectory)).rejects.toThrow();
    });
  });

  describe('Production-faithful resolution', () => {
    it('should resolve every prompt template through readMarkdown when only dist is present', async () => {
      productionRoot = await fs.mkdtemp(
        path.join(tmpdir(), 'assessmentbot-prod-root-'),
      );
      await fs.symlink(compiledRoot, path.join(productionRoot, 'dist'), 'dir');

      const result = await runProductionResolution(
        productionRoot,
        templateNames,
      );

      expect(result.code, result.stderr).toBe(0);

      const resolved = parseResolvedContents(result);
      for (const name of templateNames) {
        const expected = await fs.readFile(
          path.join(sourceTemplatesDirectory, name),
          'utf8',
        );
        expect(resolved[name]).toBe(expected);
      }
    });
  });
});
