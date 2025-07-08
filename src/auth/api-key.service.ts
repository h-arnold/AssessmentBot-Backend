import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyService {
  constructor(private configService: ConfigService) {}

  validate(token: string): { userId: string; roles: string[] } | null {
    // Skeleton implementation for now. Will be implemented in Green Phase.
    return null;
  }
}
