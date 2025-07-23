import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { z } from 'zod';

import { User } from './user.interface';
import { ConfigService } from '../config/config.service';

@Injectable()
export class ApiKeyService {
  private readonly apiKeys: string[];

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(Logger)
    private readonly logger: Logger = new Logger(ApiKeyService.name),
  ) {
    const apiKeysFromConfig = this.configService.get('API_KEYS');
    this.apiKeys = Array.isArray(apiKeysFromConfig) ? apiKeysFromConfig : [];
    this.logger.debug(`Loaded API keys: ${JSON.stringify(this.apiKeys)}`);
    if (!this.apiKeys.length) {
      this.logger.warn(
        'No API keys configured. All requests will be unauthorised.',
      );
    }
  }

  validate(apiKey: unknown): User | null {
    this.logger.debug(`Attempting to validate an API key.`);
    const apiKeySchema = z
      .string()
      .min(10)
      .regex(/^[a-zA-Z0-9_-]+$/);
    const parsed = apiKeySchema.safeParse(apiKey);
    if (!parsed.success) {
      this.logger.warn('API key is missing or invalid.');
      throw new UnauthorizedException('Invalid API key');
    }
    const validKey = parsed.data;
    const isValid = this.apiKeys.includes(validKey);
    if (isValid) {
      this.logger.log('API key authentication attempt successful');
      return { apiKey: validKey };
    }
    this.logger.warn(`Invalid API key: ${JSON.stringify(validKey)}`);
    throw new UnauthorizedException('Invalid API key');
  }
}
