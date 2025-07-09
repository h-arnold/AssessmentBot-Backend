import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { z } from 'zod';

// Define the Zod schema for environment variables
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
});

// Infer the type from the schema
export type Config = z.infer<typeof configSchema>;

@Injectable()
export class ConfigService {
  private readonly config: Config;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    let loadedEnv = {};
    const envFilePath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envFilePath)) {
      loadedEnv = dotenv.parse(fs.readFileSync(envFilePath));
    }

    // Merge loaded .env variables with process.env, prioritizing process.env
    const combinedEnv = { ...loadedEnv, ...process.env };

    // Validate environment variables against the schema
    try {
      this.config = configSchema.parse(combinedEnv);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error(
          'Environment variable validation failed:',
          error.errors,
        );
        throw new Error('Invalid environment configuration.');
      }
      throw error;
    }
  }

  get<T extends keyof Config>(key: T): Config[T] {
    return this.config[key];
  }
}
