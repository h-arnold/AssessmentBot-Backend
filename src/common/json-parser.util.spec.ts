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

  it('should repair and parse a malformed JSON string', () => {
    const malformedJson = '{"name": "test", "age": 30,}'; // Malformed JSON with trailing comma
    const expected = { name: 'test', age: 30 };
    expect(util.parse(malformedJson)).toEqual(expected);
  });

  it('should handle various JSON edge cases (deep nesting, special characters, Unicode)', () => {
    const deepNestedJson = '{"a":{"b":{"c":{"d":{"e":1}}}}}';
    expect(util.parse(deepNestedJson)).toEqual({
      a: { b: { c: { d: { e: 1 } } } },
    });

    const specialCharsJson = '{"key": "value with "quotes" and \backslashes"}';
    expect(util.parse(specialCharsJson)).toEqual({
      key: 'value with ',
      quotes: 'and \backslashes',
    });

    const unicodeJson = '{"greeting": "Hello, \u00c9cole!"}';
    expect(util.parse(unicodeJson)).toEqual({ greeting: 'Hello, École!' });
  });
});
