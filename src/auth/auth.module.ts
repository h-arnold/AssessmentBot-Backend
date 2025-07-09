import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyStrategy } from './api-key.strategy';

@Module({
  imports: [PassportModule, ConfigModule],
  providers: [ApiKeyStrategy, ApiKeyGuard, ApiKeyService],
  exports: [ApiKeyStrategy, ApiKeyGuard, ApiKeyService],
})
export class AuthModule {}
