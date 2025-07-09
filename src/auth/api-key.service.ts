import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { User } from './user.interface';

@Injectable()
export class ApiKeyService {
  private readonly apiKeys: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const apiKeysFromConfig = this.configService.get<string | string[]>(
      'API_KEYS',
    );
    if (typeof apiKeysFromConfig === 'string') {
      this.apiKeys = apiKeysFromConfig.split(',').map((s) => s.trim());
    } else if (Array.isArray(apiKeysFromConfig)) {
      this.apiKeys = apiKeysFromConfig;
    } else {
      this.apiKeys = [];
    }
  }

  validate(apiKey: string): User | null {
    if (!apiKey) {
      this.logger.warn('API key is missing');
      throw new UnauthorizedException('API key is missing');
    }

    if (apiKey.length < 10) {
      this.logger.warn('API key is too short');
      throw new UnauthorizedException('Invalid API key');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
      this.logger.warn('API key contains invalid characters');
      throw new UnauthorizedException('Invalid API key');
    }

    const isValid = this.apiKeys.includes(apiKey);

    if (isValid) {
      this.logger.log('API key authentication attempt successful');
      return { apiKey };
    }

    this.logger.warn('Invalid API key');
    throw new UnauthorizedException('Invalid API key');
  }
}
