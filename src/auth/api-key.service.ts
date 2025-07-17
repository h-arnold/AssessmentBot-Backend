import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';

import { User } from './user.interface';
import { ConfigService, Config } from '../config/config.service';

/**
 * Service responsible for managing and validating API keys for authentication.
 *
 * @class ApiKeyService
 * @decorator `@Injectable`
 *
 * @constructor
 * Initializes the service with API keys retrieved from the configuration.
 * Logs a warning if no API keys are configured.
 *
 * @param {ConfigService} configService - Service for accessing application configuration.
 * @param {Logger} logger - Service for logging messages and warnings.
 *
 * @property {string[]} apiKeys - Array of valid API keys retrieved from the configuration.
 *
 * @method validate
 * Validates the provided API key against the configured API keys.
 *
 * @param {unknown} apiKey - The API key to validate.
 * @returns {User | null} - Returns a user object containing the valid API key if authentication is successful, or `null` otherwise.
 *
 * @throws {UnauthorizedException} Throws an exception if the API key is invalid or missing.
 *
 * @example
 * ```typescript
 * const user = apiKeyService.validate('validApiKey123');
 * if (user) {
 *   Logger.debug('Authentication successful:', user);
 * } else {
 *   Logger.debug('Authentication failed');
 * }
 * ```
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly apiKeys: string[];

  constructor(private readonly configService: ConfigService) {
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
    this.logger.debug(
      `API key received for validation: ${JSON.stringify(apiKey)}`,
    );
    const apiKeySchema = z
      .string()
      .min(10)
      .regex(/^[a-zA-Z0-9_-]+$/);
    const parsed = apiKeySchema.safeParse(apiKey);
    if (!parsed.success) {
      this.logger.warn(
        `API key is missing or invalid: ${JSON.stringify(apiKey)}`,
      );
      throw new UnauthorizedException('Invalid API key');
    }
    const validKey = parsed.data;
    const isValid = this.apiKeys.includes(validKey);
    if (isValid) {
      this.logger.info('API key authentication attempt successful');
      return { apiKey: validKey };
    }
    this.logger.warn(`Invalid API key: ${JSON.stringify(validKey)}`);
    throw new UnauthorizedException('Invalid API key');
  }
}
