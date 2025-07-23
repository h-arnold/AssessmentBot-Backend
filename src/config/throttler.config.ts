import { ThrottlerModuleOptions } from '@nestjs/throttler';

import { configSchema } from './env.schema';

// Note: We are not using the ConfigService to get these values because
// they need to be available at compile time for the decorators to work.
// Instead, we are getting them directly from the environment variables.
const validatedEnv = configSchema.parse(process.env);

const throttlerTtl = validatedEnv.THROTTLER_TTL;
const unauthenticatedLimit = validatedEnv.UNAUTHENTICATED_THROTTLER_LIMIT;
const authenticatedLimit = validatedEnv.AUTHENTICATED_THROTTLER_LIMIT;

export const throttlerConfig: ThrottlerModuleOptions = [
  {
    ttl: throttlerTtl,
    limit: unauthenticatedLimit,
  },
];

export const authenticatedThrottler = {
  default: {
    ttl: throttlerTtl,
    limit: authenticatedLimit,
  },
};
