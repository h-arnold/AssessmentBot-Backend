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
    const json = '{name: "test",}';
    const expected = { name: 'test' };
    expect(util.parse(json)).toEqual(expected);
  });

  });
