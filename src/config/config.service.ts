import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { z } from 'zod';

import { configSchema, type Config } from './env.schema';

/**
 * ConfigService
 *
 * This service acts as the single source of truth for all environment configuration in the application.
 * It loads environment variables from both process.env and .env files, then validates and transforms them using Zod schemas.
 *
 * Architectural reasoning:
 * - Centralises configuration access and validation, ensuring all config is type-safe and robustly validated at startup.
 * - Uses Zod for schema-based validation, catching misconfigurations early and providing clear error messages.
 * - Avoids direct usage of @nestjs/config's ConfigService outside this module, preventing fragmentation and spaghetti code.
 * - All consumers should inject and use this service only, never @nestjs/config directly.
 * - This approach makes configuration easy to mock in tests and ensures consistent behaviour across environments.
 *
 * Maintainers: If you need to add new environment variables, update the Zod schema here and document the expected types/defaults.
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
        throw new Error(`Invalid environment configuration: ${error.message}`);
      }
      throw error;
    }
  }

  get<T extends keyof Config>(key: T): Config[T] {
    return this.config[key];
  }

  getGlobalPayloadLimit(): string {
    const maxImageSizeMB = this.config.MAX_IMAGE_UPLOAD_SIZE_MB;
    // Formula: ((MAX_IMAGE_UPLOAD_SIZE_MB * 1.33 * 3) + 1) MB
    const limitInMB = Math.ceil(maxImageSizeMB * 1.33 * 3 + 1);
    return `${limitInMB}mb`;
  }
}
