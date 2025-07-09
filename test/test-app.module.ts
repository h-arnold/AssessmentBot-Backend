import { Module } from '@nestjs/common';

import { TestController } from './test.controller';
import { AppModule } from '../src/app.module'; // Import the main AppModule

@Module({
  imports: [AppModule], // Import the main application module
  controllers: [TestController], // Declare the test controller
  // No providers needed here as global pipes/filters will be registered in main.e2e-spec.ts
})
export class TestAppModule {}
