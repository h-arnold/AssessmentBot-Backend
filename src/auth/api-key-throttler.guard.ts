import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ApiKeyThrottlerGuard.name);

  constructor(
    private readonly apiKeyGuard: ApiKeyGuard,
    reflector: Reflector,
  ) {
    super(
      {
        // @ts-expect-error - We are not using the options object
        storage: null,
        throttlers: [],
      },
      null,
      reflector,
    );
  }

  protected async getTracker(req: {
    headers?: { authorization?: string };
    ip?: string;
  }): Promise<string> {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);
      this.logger.debug(`Using API Key for throttling: ${apiKey}`);
      return apiKey;
    }

    const ip = req.ip;
    this.logger.debug(`Using IP for throttling: ${ip}`);
    return ip;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await this.apiKeyGuard.canActivate(context);
    if (!canActivate) {
      return false;
    }

    return super.canActivate(context);
  }
}
