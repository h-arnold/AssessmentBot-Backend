import { Controller, Get } from '@nestjs/common';

<<<<<<< HEAD
import { AppService, HealthCheckResponse } from './app.service';
=======
import { AppService } from './app.service';
>>>>>>> c166268 (Fix: Resolve ESLint security and pre-commit hook blockers)

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
<<<<<<< HEAD
  getHealth(): HealthCheckResponse {
=======
  getHealth(): string {
>>>>>>> c166268 (Fix: Resolve ESLint security and pre-commit hook blockers)
    return this.appService.getHealth();
  }
}
