import { Controller, Get, HttpException, UseGuards, Req } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import { StatusService, HealthCheckResponse } from './status.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import type { User } from '../auth/user.interface';

/**
 * Controller responsible for providing application status and health endpoints.
 *
 * This controller provides several endpoints for monitoring the application's
 * health, testing error handling, and verifying authentication functionality.
 * It serves as a diagnostic tool for both development and production environments.
 */
@Controller()
export class StatusController {
  /**
   * Constructs the StatusController.
   *
   * @param statusService - Service providing status and health check functionality
   */
  constructor(private readonly statusService: StatusService) {}

  /**
   * Returns a simple greeting message.
   *
   * This endpoint provides a basic connectivity test and confirms the
   * application is responding to requests.
   *
   * @returns A simple "Hello World!" message
   */
  @Get()
  getHello(): string {
    return this.statusService.getHello();
  }

  /**
   * Provides comprehensive health check information about the application.
   *
   * This endpoint returns detailed information about the application's health,
   * including version, timestamp, and system information. Useful for monitoring
   * and diagnostic purposes.
   *
   * @returns Detailed health check response including system information
   */
  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.statusService.getHealth();
  }

  /**
   * Deliberately throws an error for testing error handling.
   *
   * This endpoint is used to test the application's error handling mechanisms
   * and exception filters. It intentionally throws a 400 Bad Request error.
   *
   * @throws {HttpException} Always throws a 400 Bad Request error with test message
   */
  @Get('test-error')
  testError(): void {
    throw new HttpException('This is a test error', 400);
  }
}
