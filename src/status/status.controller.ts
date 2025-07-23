import { Controller, Get, HttpException, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { StatusService, HealthCheckResponse } from './status.service';

@Controller()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  getHello(): string {
    return this.statusService.getHello();
  }

  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.statusService.getHealth();
  }

  @Get('test-error')
  testError(): void {
    throw new HttpException('This is a test error', 400);
  }
}
