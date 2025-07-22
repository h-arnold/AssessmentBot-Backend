import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ApiKeyThrottlerGuard.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const headers = (req as { headers?: { authorization?: string } }).headers;
    const ip = (req as { ip?: string }).ip;
    const authHeader = headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      // Return the API key as the tracker
      return authHeader.substring(7);
    }
    // Fallback to IP if no key is present
    return typeof ip === 'string' ? ip : '';
  }
}
