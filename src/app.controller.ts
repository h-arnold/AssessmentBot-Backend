import { Controller, Get, HttpException, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';

import { AppService, HealthCheckResponse } from './app.service';
import { ApiKeyGuard } from './auth/api-key.guard';
import { User } from './auth/user.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.appService.getHealth();
  }

  @Get('test-error')
  testError(): void {
    throw new HttpException('This is a test error', 400);
  }

  @UseGuards(ApiKeyGuard)
  @Get('protected')
  getProtected(@Req() req: Request): { message: string; user: User } {
    return { message: 'This is a protected endpoint', user: req.user as User };
  }
}
