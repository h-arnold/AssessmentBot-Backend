import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { z } from 'zod';

// Define the Zod schema for environment variables
/**
 * Defines the schema for application configuration using Zod.
 *
 * This schema validates and transforms environment variables to ensure
 * they meet the expected format and constraints. It includes the following properties:
 *
 * - `NODE_ENV`: Specifies the environment in which the application is running.
 *   Must be one of 'development', 'production', or 'test'.
 *
 * - `PORT`: The port number on which the application will run.
 *   Must be an integer between 1 and 65535. Defaults to 3000.
 *
 * - `APP_NAME`: The name of the application. Defaults to 'AssessmentBot-Backend'.
 *
 * - `APP_VERSION`: The version of the application. Optional.
 *
 * - `API_KEYS`: A comma-separated list of API keys. Transformed into an array of strings
 *   that match the regex /^[a-zA-Z0-9_-]+$/. Optional.
 *
 * - `MAX_IMAGE_UPLOAD_SIZE_MB`: The maximum allowed size for image uploads in megabytes.
 *   Must be a non-negative integer. Defaults to 1.
 *
 * - `ALLOWED_IMAGE_MIME_TYPES`: A comma-separated list of allowed image MIME types.
 *   Defaults to 'image/png'. Transformed into an array of strings.
 *
 * - `GEMINI_API_KEY`: The API key for Gemini integration. Must be a non-empty string.
 */
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_NAME: z.string().default('AssessmentBot-Backend'),
  APP_VERSION: z.string().optional(),
  API_KEYS: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((s) => s.trim()) : undefined))
    .pipe(z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).optional()),
  MAX_IMAGE_UPLOAD_SIZE_MB: z.coerce.number().int().min(0).default(1),
  ALLOWED_IMAGE_MIME_TYPES: z
    .string()
    .default('image/png')
    .transform((val) => val.split(',').map((s) => s.trim())),
  GEMINI_API_KEY: z.string().min(1),
  LOG_LEVEL: z
    .enum(['info', 'error', 'warn', 'debug', 'verbose', 'fatal'])
    .default('info'),
  THROTTLER_TTL: z.coerce.number().int().min(0).default(60),
  UNAUTHENTICATED_THROTTLER_LIMIT: z.coerce.number().int().min(0).default(5),
  AUTHENTICATED_THROTTLER_LIMIT: z.coerce.number().int().min(0).default(20),
});

// Infer the type from the schema
export type Config = z.infer<typeof configSchema>;

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
