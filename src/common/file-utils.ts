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
