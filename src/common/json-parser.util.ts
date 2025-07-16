import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { jsonrepair } from 'jsonrepair';

/**
 * Utility class for parsing and repairing JSON strings.
 * This class attempts to repair malformed JSON strings using the `jsonrepair` library
 * and then parses them into JavaScript objects.
 *
 * @example
 * ```typescript
 * const jsonParser = new JsonParserUtil();
 * const parsedObject = jsonParser.parse('```json\n{"key": "value"}\n```');
 * ```
 *
 * @throws {BadRequestException} Thrown when the provided JSON string is irreparable or malformed.
 */
@Injectable()
export class JsonParserUtil {
  private logger = new Logger(JsonParserUtil.name);

  /**
   * Parses and repairs a JSON string into a structured object or array.
   * Optionally trims content outside the first and last curly brackets.
   * If the parsed result is not an object or array (e.g., a string or number),
   * it is considered a failure, as the primary use case is for structured data.
   *
   * @param jsonString The raw string that may contain JSON.
   * @param trim If true, trims content before the first '{' and after the last '}'. Defaults to true.
   * @returns The parsed JavaScript object or array.
   */
  parse(jsonString: string, trim = true): unknown {
    let processedString = jsonString;
    let jsonContent = '';

    const jsonBlockRegex = /```json\n([\s\S]*?)\n```/;
    const match = jsonString.match(jsonBlockRegex);

    if (match && match[1]) {
      jsonContent = match[1];
      this.logger.debug('Extracted JSON from markdown block.');
    } else if (trim) {
      const firstBracketIndex = processedString.indexOf('{');
      const lastBracketIndex = processedString.lastIndexOf('}');

      if (firstBracketIndex !== -1 && lastBracketIndex > firstBracketIndex) {
        jsonContent = processedString.slice(
          firstBracketIndex,
          lastBracketIndex + 1,
        );
        this.logger.debug('Extracted JSON by trimming brackets.');
      } else {
        this.logger.error(
          `JSON parsing failed: No JSON object found in input: ${jsonString}`,
        );
        throw new BadRequestException(
          'No valid JSON object found in response.',
        );
      }
    } else {
      jsonContent = processedString;
    }

    try {
      const repairedJsonString = jsonrepair(jsonContent);
      const parsed = JSON.parse(repairedJsonString);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Parsed JSON is not a structured object or array.');
      }

      this.logger.log(`Repaired JSON for debug: ${repairedJsonString}`);
      return parsed;
    } catch (error) {
      this.logger.error(`JSON parsing failed for input: ${jsonString}`, error);
      throw new BadRequestException(
        'Malformed or irreparable JSON string provided.',
      );
    }
  }
}
