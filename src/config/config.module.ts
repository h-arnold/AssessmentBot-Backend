import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { ConfigService } from './config.service';

/**
 * ConfigModule
 *
 * This module wraps NestJS's ConfigModule to load .env files, but only exports the custom ConfigService for use elsewhere.
 *
 * Architectural reasoning:
 * - Ensures that all configuration access and validation is centralised through the custom ConfigService.
 * - Prevents direct usage of @nestjs/config's ConfigService outside this module, reducing risk of spaghetti code and inconsistent config access.
 * - All other modules should import this ConfigModule only, and inject ConfigService for configuration needs.
 * - This approach makes configuration management clear, maintainable, and easy to test.
 *
 * Maintainers: Always import this module (not NestConfigModule) in other modules. Update providers/exports here if you add new config-related services.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: '.env',
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
