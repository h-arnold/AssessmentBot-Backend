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
  public logger = new Logger(JsonParserUtil.name);

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

    if (trim) {
      const firstBracketIndex = processedString.indexOf('{');
      const lastBracketIndex = processedString.lastIndexOf('}');

      if (firstBracketIndex !== -1 && lastBracketIndex > firstBracketIndex) {
        processedString = processedString.slice(
          firstBracketIndex,
          lastBracketIndex + 1,
        );
      }
    }

    try {
      const repairedJsonString = jsonrepair(processedString);
      const parsed = JSON.parse(repairedJsonString);

      // The primary use case is for LLM responses, which should be objects/arrays.
      // If parsing results in a primitive type, it's likely due to
      // `jsonrepair` turning non-JSON text into a string literal. This is an error condition for us.
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
