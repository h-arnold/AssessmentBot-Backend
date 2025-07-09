import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

import { ApiKeyService } from './api-key.service';
import { User } from './user.interface';

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
