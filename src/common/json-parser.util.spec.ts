import { BadRequestException, Logger } from '@nestjs/common';

import { JsonParserUtil } from './json-parser.util';

// Use a real Logger and spy on its methods
const realLogger = new Logger('JsonParserUtil');
let logSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

describe('JsonParserUtil', () => {
  let util: JsonParserUtil;

  beforeEach(() => {
    util = new JsonParserUtil();
    // Replace the logger with a real Logger and spy on its methods
    (util as JsonParserUtil).logger = realLogger;
    logSpy = jest.spyOn(realLogger, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(realLogger, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(util).toBeDefined();
  });

  it('should successfully parse a valid JSON string', () => {
    const json = '{"name": "test"}';
    const expected = { name: 'test' };
    expect(util.parse(json)).toEqual(expected);
  });

  it('should repair and parse a malformed JSON string', () => {
    const malformedJson = '{"name": "test", "age": 30,}'; // Malformed JSON with trailing comma
    const expected = { name: 'test', age: 30 };
    expect(util.parse(malformedJson)).toEqual(expected);
  });

  it('should trim content outside curly brackets by default', () => {
    const jsonWithExtraContent = '```json\n{"key": "value"}\n```';
    const expected = { key: 'value' };
    expect(util.parse(jsonWithExtraContent)).toEqual(expected);
  });

  it('should not trim content when trim is false', () => {
    const jsonWithExtraContent = 'some-prefix {"key": "value"}';
    // Expecting a failure because the prefix makes it invalid JSON
    expect(() => util.parse(jsonWithExtraContent, false)).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException for irreparable JSON and log the original string', () => {
    const irreparableJson = 'this is not json';
    expect(() => util.parse(irreparableJson)).toThrow(BadRequestException);
    expect(errorSpy).toHaveBeenCalledWith(
      `JSON parsing failed for input: ${irreparableJson}`,
      expect.any(Error),
    );
  });

  it('should handle JSON embedded within other text and markdown', () => {
    const embeddedJson =
      'Here is the JSON:\n```json\n{"user": {"id": 1, "name": "John Doe"}}\n```\nThanks!';
    const expected = { user: { id: 1, name: 'John Doe' } };
    expect(util.parse(embeddedJson)).toEqual(expected);
  });
});
