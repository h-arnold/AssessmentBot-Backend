import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { AssessorModule } from './v1/assessor/assessor.module';

/**
 * The main application module that serves as the entry point for the backend application.
 *
 * @module AppModule
 * @description
 * This module imports essential feature modules and configuration modules required for the application.
 * It also defines the controllers and providers that will be used throughout the application.
 *
 * @imports
 * - `ConfigModule`: Handles application configuration and environment variables.
 * - `CommonModule`: Provides shared utilities and services across the application.
 * - `AuthModule`: Manages authentication and authorization functionalities.
 * - `AssessorModule`: Contains logic related to assessors and their operations.
 *
 * @controllers
 * - `AppController`: The main controller for handling application-level requests.
 *
 * @providers
 * - `AppService`: The primary service for application-level business logic.
 */
@Module({
  imports: [ConfigModule, CommonModule, AuthModule, AssessorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
