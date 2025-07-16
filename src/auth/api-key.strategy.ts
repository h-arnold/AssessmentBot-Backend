import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

import { ApiKeyService } from './api-key.service';
import { User } from './user.interface';

/**
 * Strategy for authenticating users using an API key.
 * This class extends the PassportStrategy and integrates with the ApiKeyService
 * to validate API keys and retrieve the associated user.
 *
 * @class ApiKeyStrategy
 * @extends PassportStrategy
 * @constructor
 * @param {ApiKeyService} apiKeyService - Service responsible for validating API keys.
 *
 * @method validate
 * Validates the provided API key and retrieves the associated user.
 * Throws an UnauthorizedException if the API key is invalid or no user is found.
 *
 * @param {string} apiKey - The API key to validate.
 * @returns {Promise<User>} - The user associated with the valid API key.
 * @throws {UnauthorizedException} - If the API key is invalid or no user is found.
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async validate(apiKey: string): Promise<User> {
    const user = await this.apiKeyService.validate(apiKey);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
