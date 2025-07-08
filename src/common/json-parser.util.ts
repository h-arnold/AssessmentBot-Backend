import { Injectable } from '@nestjs/common';
import { jsonrepair } from 'jsonrepair';

@Injectable()
export class JsonParserUtil {
  parse<T>(json: string): T {
    return JSON.parse(jsonrepair(json));
  }
}