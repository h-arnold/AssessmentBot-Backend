import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { z } from 'zod';

import { configSchema, type Config } from './env.schema';

/**
 * @class ConfigService
 *
 * @description
 * This service is the single source of truth for all **runtime** environment configuration in the application.
 * It is responsible for loading environment variables from `.env` files and `process.env`, validating them against
 * the centralized `configSchema`, and making them available to the rest of the application through a clean, injectable service.
 *
 * @remarks
 * **Architectural Reasoning:**
 * - **Centralisation:** All configuration access is channelled through this service, preventing configuration sprawl
 *   and ensuring consistency. Consumers inject this service rather than accessing `process.env` directly.
 * - **Validation at Startup:** By using the shared `configSchema`, the service validates the entire application
 *   configuration when it is instantiated. This catches misconfigurations early and causes the application to fail fast,
 *   which is a critical practice for robust systems.
 * - **Decoupling:** It abstracts the source of the configuration (e.g., `.env` vs. `process.env`) from the consumer.
 * - **Testability:** Centralising configuration makes it significantly easier to mock for unit and integration tests.
 *
 * **Usage:**
 * This service should be injected into any module that requires access to configuration values at runtime.
 * For configuration needed at **compile time** (e.g., in decorators), see `throttler.config.ts`.
 *
 * @see env.schema.ts - For the source of truth on validation rules.
 * @see throttler.config.ts - For an example of compile-time configuration.
 */
@Injectable()
export class ConfigService {
  private readonly config: Config;

  constructor() {
    let loadedEnv = {};

    // Determine which env file to load based on NODE_ENV
    const envFileName = process.env.NODE_ENV === 'test' ? '.test.env' : '.env';
    const envFilePath = path.resolve(process.cwd(), envFileName);

    // envFilePath is constructed from cwd and a fixed filename, safe to use
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(envFilePath)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      loadedEnv = dotenv.parse(fs.readFileSync(envFilePath));
    }

    // Merge loaded .env variables with process.env, prioritizing process.env
    const combinedEnv = { ...loadedEnv, ...process.env };

    // Validate environment variables against the schema
    try {
      this.config = configSchema.parse(combinedEnv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid environment configuration: ${error.message}`); // Or a custom/NestJS exception
      }
      throw error;
    }
  }

  /**
   * Retrieves a configuration value by its key.
   * @param key The key of the configuration value to retrieve.
   * @returns The typed configuration value.
   */
  get<T extends keyof Config>(key: T): Config[T] {
    return this.config[key];
  }

  /**
   * Calculates the global payload limit for the application based on the max image upload size.
   * This is used to configure the `body-parser` middleware.
   * @returns A string representing the payload limit (e.g., '9mb').
   */
  getGlobalPayloadLimit(): string {
    const maxImageSizeMB = this.config.MAX_IMAGE_UPLOAD_SIZE_MB;
    // Formula: ((MAX_IMAGE_UPLOAD_SIZE_MB * 1.33 * 3) + 1) MB
    const limitInMB = Math.ceil(maxImageSizeMB * 1.33 * 3 + 1);
    return `${limitInMB}mb`;
  }
}
