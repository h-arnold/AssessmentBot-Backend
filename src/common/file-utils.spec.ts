import path from 'path';

import { getCurrentDirname, readMarkdown } from './file-utils';

describe('getCurrentDirname', () => {
  it('should return process.cwd() in Jest test environment', () => {
    const result = getCurrentDirname();
    expect(result).toBe(process.cwd());
  });

  it('should use fallback directory when provided', () => {
    const fallbackDir = '/custom/test/path';
    const result = getCurrentDirname(fallbackDir);
    expect(result).toBe(fallbackDir);
  });

  it('should return process.cwd() when no fallback is provided', () => {
    const result = getCurrentDirname();
    expect(result).toBe(process.cwd());
  });
});

describe('readMarkdown', () => {
  it('returns an empty string when no name is provided', async () => {
    await expect(readMarkdown('')).resolves.toBe('');
  });

  it('throws when the filename is invalid', async () => {
    await expect(readMarkdown('notes.txt')).rejects.toThrow(
      'Invalid markdown filename',
    );
  });

  it('throws when the filename attempts path traversal', async () => {
    await expect(readMarkdown('../secrets.md')).rejects.toThrow(
      'Invalid markdown filename',
    );
  });

  it('reads markdown content from the provided base path', async () => {
    const basePath = path.join(process.cwd(), 'test', 'fixtures');

    await expect(readMarkdown('sample.md', basePath)).resolves.toBe(
      '# Hello\n',
    );
  });

  it('throws a not-found error when the file is missing', async () => {
    const basePath = path.join(process.cwd(), 'test', 'fixtures');

    await expect(readMarkdown('missing.md', basePath)).rejects.toThrow(
      'Markdown file not found',
    );
  });
});
