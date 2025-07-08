import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class JsonParserUtil {
  parse(jsonString: string): unknown {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new BadRequestException('Malformed or irreparable JSON string provided.');
    }
  }
}