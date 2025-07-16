import * as fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Utility function to get current directory path that works in both
 * Node.js ESM runtime and Jest test environment
 *
 * @param fallbackDir - Fallback directory for tests, defaults to process.cwd()
 */
export function getCurrentDirname(fallbackDir?: string): string {
  try {
    // Use dynamic evaluation to avoid TypeScript compilation issues in Jest
    // This will work in ESM runtime but fail gracefully in Jest
    const metaUrl = new Function('return import.meta.url')();
    return path.dirname(fileURLToPath(metaUrl));
  } catch (error) {
    // In Jest environment or other environments where import.meta.url is not available
    // Fall back to process.cwd() or provided fallbackDir
    return fallbackDir || process.cwd();
  }
}

/**
 * Reads the content of a markdown file from the specified directory.
 *
 * This method ensures security by validating the filename and path to prevent
 * path traversal attacks and unauthorized file access.
 *
 * @param name - The name of the markdown file to read. Must end with `.md` and
 *               must not contain path traversal sequences (`..`).
 * @param basePath - The base directory to read from. Defaults to 'src/prompt/templates'.
 * @returns A promise that resolves to the content of the markdown file as a string.
 * @throws {Error} If the filename is invalid or the resolved path is unauthorized.
 */
export async function readMarkdown(
  name: string,
  basePath?: string,
): Promise<string> {
  basePath = basePath ?? 'src/prompt/templates';
  if (!name) return '';
  if (name.includes('..') || !name.endsWith('.md')) {
    throw new Error('Invalid markdown filename');
  }
  const baseDir = path.resolve(basePath);
  const resolvedPath = path.resolve(baseDir, name);
  if (!resolvedPath.startsWith(baseDir)) {
    throw new Error('Unauthorised file path');
  }
  // resolvedPath is validated above, safe to use as argument
  const content = await fs.readFile(resolvedPath, { encoding: 'utf-8' });
  return content;
}
