import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { ApiKeyStrategy } from './api-key.strategy';

@Module({
  imports: [PassportModule, ConfigModule],
  providers: [ApiKeyStrategy, ApiKeyGuard, ApiKeyService, Logger],
  exports: [ApiKeyStrategy, ApiKeyGuard, ApiKeyService],
})
export class AuthModule {}
