import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'bearer') {
  constructor(private configService: ConfigService) {
    super();
  }

  async validate(token: string): Promise<{ userId: string; roles: string[] }> {
    // This is a skeleton. Actual validation logic will be implemented in the Green Phase.
    // For now, it will always throw UnauthorizedException to make tests fail.
    throw new UnauthorizedException();
  }
}
