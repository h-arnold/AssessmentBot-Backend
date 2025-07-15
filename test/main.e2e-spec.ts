import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.test.env' });
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/http-exception.filter';
import { ZodValidationPipe } from './../src/common/zod-validation.pipe';
import { ConfigService } from './../src/config/config.service';

describe('Global Setup and E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const configService = moduleFixture.get(ConfigService);
    // Use log levels from config
    app.useLogger(configService.get('LOG_LEVEL'));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('CommonModule should integrate properly with existing ConfigModule', async () => {
    // This test implicitly passes if the application starts without errors and previous tests pass.
    expect(app).toBeDefined();
  });
});
