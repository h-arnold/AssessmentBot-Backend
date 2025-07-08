import { BadRequestException } from '@nestjs/common';

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
    expect(() => util.parse(irreparableJson)).toThrow(new BadRequestException('Malformed or irreparable JSON string provided.'));
  });

  });
