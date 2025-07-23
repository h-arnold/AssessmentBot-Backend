import { Controller, Get, HttpException, UseGuards, Req } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import { StatusService, HealthCheckResponse } from './status.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import type { User } from '../auth/user.interface';

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

  @UseGuards(ApiKeyGuard)
  @Get('check-auth')
  checkAuth(@Req() req: Request): { message: string; user: User } {
    return this.statusService.checkAuth(req.user as User);
  }
}
