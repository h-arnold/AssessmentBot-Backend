import { BadRequestException, Logger } from '@nestjs/common';

import { JsonParserUtil } from './json-parser.util';

describe('JsonParserUtil', () => {
  let util: JsonParserUtil;

  beforeEach(() => {
    util = new JsonParserUtil();
  });

  it('should be defined', () => {
    expect(util).toBeDefined();
  });

  it('should successfully parse a valid JSON string', () => {
    const json = '{"name": "test"}';
    const expected = { name: 'test' };
    expect(util.parse(json)).toEqual(expected);
  });

  it('should throw a BadRequestException for irreparable JSON', () => {
    const irreparableJson = '{{invalid json}';
    expect(() => util.parse(irreparableJson)).toThrow(
      new BadRequestException('Malformed or irreparable JSON string provided.'),
    );
  });

  it('should log parsing attempts and failures', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const validJson = '{"key": "value"}';
    util.parse(validJson);
    expect(loggerSpy).not.toHaveBeenCalled(); // No warning for successful parse

    const invalidJson = 'invalid json';
    try {
      util.parse(invalidJson);
    } catch (e) {
      // Expected to throw, so catch it
    }
    expect(loggerSpy).toHaveBeenCalledWith(
      'JSON parsing failed', // The message from JsonParserUtil
      expect.any(Error), // The error object
    );
  });
});
