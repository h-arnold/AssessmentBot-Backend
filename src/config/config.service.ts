
import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

@Injectable()
export class ConfigService {
  private readonly envConfig: Record<string, any>;

  constructor() {
    const envFilePath = path.resolve(process.cwd(), '.env');
    const envConfig = fs.existsSync(envFilePath)
      ? dotenv.parse(fs.readFileSync(envFilePath))
      : {};

    const config = { ...envConfig, ...process.env };

    // Define your schema here
    const configSchema = z.object({
        TEST_VAR: z.string().optional(),
        TEST_VAR_DOTENV: z.string().optional(),
        PRIORITIZED_VAR: z.string().optional(),
    });

    this.envConfig = configSchema.parse(config);
  }

  get(key: string): any {
    return this.envConfig[key];
  }
}
