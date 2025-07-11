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
 * const parsedObject = jsonParser.parse('{"key": "value"}');
 * ```
 *
 * @throws {BadRequestException} Thrown when the provided JSON string is irreparable or malformed.
 */
@Injectable()
export class JsonParserUtil {
  private readonly logger = new Logger(JsonParserUtil.name);

  parse(jsonString: string): unknown {
    try {
      const repairedJsonString = jsonrepair(jsonString);
      this.logger.log(`Repaired JSON for debug: ${repairedJsonString}`);
      return JSON.parse(repairedJsonString);
    } catch (error) {
      this.logger.warn('JSON parsing failed', error);
      throw new BadRequestException(
        'Malformed or irreparable JSON string provided.',
      );
    }
  }
}
