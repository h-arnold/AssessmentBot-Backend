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
export const configSchema = z.object({
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
  THROTTLER_TTL: z.coerce.number().int().min(0).default(10000),
  UNAUTHENTICATED_THROTTLER_LIMIT: z.coerce.number().int().min(0).default(5),
  AUTHENTICATED_THROTTLER_LIMIT: z.coerce.number().int().min(0).default(10),
});

// Infer the type from the schema
export type Config = z.infer<typeof configSchema>;
