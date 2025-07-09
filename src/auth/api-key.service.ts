import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { User } from './user.interface';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly apiKeys: string[];

  constructor(private readonly configService: ConfigService) {
    this.apiKeys = this.configService.get<string[]>('API_KEYS') || [];
  }

  validate(apiKey: string): User | null {
    this.logger.log(`Validating API key: ${apiKey}`);
    const isValid = this.apiKeys.includes(apiKey);
    if (isValid) {
      this.logger.log(`API key is valid`);
      return { apiKey };
    }
    this.logger.warn(`Invalid API key: ${apiKey}`);
    return null;
  }
}
