import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { jsonrepair } from 'jsonrepair';

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
