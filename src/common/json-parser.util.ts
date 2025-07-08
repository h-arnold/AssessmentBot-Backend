import { BadRequestException, Injectable } from '@nestjs/common';
import { jsonrepair, JSONRepairError } from 'jsonrepair';

@Injectable()
export class JsonParserUtil {
  parse<T>(json: string): T {
    try {
      return JSON.parse(jsonrepair(json));
    } catch (error) {
      if (error instanceof JSONRepairError) {
        throw new BadRequestException(`Failed to parse JSON: ${error.message}`);
      }
      throw error;
    }
  }
}