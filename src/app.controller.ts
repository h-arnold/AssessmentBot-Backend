import { Controller, Get, HttpException, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';

import { AppService, HealthCheckResponse } from './app.service';
import { ApiKeyGuard } from './auth/api-key.guard';
import { User } from './auth/user.interface';

/**
 * Controller for handling application routes.
 */
@Controller()
export class AppController {
  /**
   * Constructs the AppController instance.
   * @param appService - The service providing application logic.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Handles the root GET request and returns a greeting message.
   * @returns A greeting message as a string.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Handles the GET request for the health check endpoint.
   * @returns The health check response object.
   */
  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.appService.getHealth();
  }

  /**
   * Handles the GET request for testing error handling.
   * Throws an HTTP exception with a test error message and status code 400.
   */
  @Get('test-error')
  testError(): void {
    throw new HttpException('This is a test error', 400);
  }

  /**
   * Handles the GET request for a protected endpoint.
   * Requires an API key guard for access.
   * @param req - The incoming request object.
   * @returns An object containing a message and the authenticated user.
   */
  @UseGuards(ApiKeyGuard)
  @Get('protected')
  getProtected(@Req() req: Request): { message: string; user: User } {
    return { message: 'This is a protected endpoint', user: req.user as User };
  }
}
