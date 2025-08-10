import * as os from 'os';

import { Injectable } from '@nestjs/common';

import * as packageJson from '../../package.json';
import { User } from '../auth/user.interface';

/**
 * Interface representing system information for health checks.
 */
interface SystemInfo {
  /** Operating system platform */
  platform: string;
  /** System architecture */
  arch: string;
  /** Operating system release version */
  release: string;
  /** System uptime in seconds */
  uptime: number;
  /** System hostname */
  hostname: string;
  /** Total system memory in bytes */
  totalMemory: number;
  /** Free system memory in bytes */
  freeMemory: number;
  /** Number of CPU cores */
  cpus: number;
}

/**
 * Interface representing the complete health check response.
 */
export interface HealthCheckResponse {
  /** Overall application status */
  status: string;
  /** Application version from package.json */
  version: string;
  /** ISO timestamp of when the health check was performed */
  timestamp: string;
  /** Detailed system information */
  systemInfo: SystemInfo;
}

/**
 * Service providing status and health check functionality for the application.
 *
 * This service offers various endpoints for monitoring application health,
 * testing connectivity, and verifying authentication. It gathers system
 * information and provides diagnostic capabilities for operational monitoring.
 */
@Injectable()
export class StatusService {
  /**
   * Returns a simple greeting message.
   *
   * This method provides a basic connectivity test response that confirms
   * the application is running and responding to requests.
   *
   * @returns A simple "Hello World!" greeting message
   */
  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Generates a comprehensive health check response.
   *
   * This method collects detailed information about the application and system
   * state, including version information, current timestamp, and system metrics
   * such as memory usage, CPU count, and uptime.
   *
   * @returns Complete health check response with application and system information
   */
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      version: packageJson.version,
      timestamp: new Date().toISOString(),
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        hostname: os.hostname(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus().length,
      },
    };
  }

  /**
   * Validates authentication and returns user information.
   *
   * This method is used by protected endpoints to confirm that authentication
   * is working correctly. It returns the authenticated user's information
   * along with a confirmation message.
   *
   * @param user - The authenticated user object from the request
   * @returns Object containing confirmation message and user information
   */
  checkAuth(user: User): { message: string; user: { apiKey: string } } {
    return {
      message: 'This is a protected endpoint',
      user: { ...user, apiKey: '***redacted***' },
    };
  }
}
