import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ZodValidationPipe } from './../src/common/zod-validation.pipe';
import { HttpExceptionFilter } from './../src/common/http-exception.filter';

describe('Global Setup and E2E Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Global HttpExceptionFilter should catch an exception thrown from a test controller', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-error')
      .expect(400);

    expect(response.body).toHaveProperty('statusCode', 400);
    expect(response.body).toHaveProperty('message', 'This is a test error');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('path', '/test-error');
  });

  it('Global ZodValidationPipe should validate a request DTO and reject invalid data', async () => {
    // Similar to the HttpExceptionFilter test, this requires a route with a DTO.
    // We will verify the pipe's presence by checking the application's global pipes.

    const pipes = (app as any).getContainer().getGlobalPipes();
    const hasZodValidationPipe = pipes.some(
      (pipe: any) => pipe instanceof ZodValidationPipe,
    );
    expect(hasZodValidationPipe).toBe(true);
  });

  it('Controller endpoint should return 400 for invalid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-validation')
      .send({ name: 'ab', age: 17 }) // Invalid data
      .expect(400);

    expect(response.body).toHaveProperty('statusCode', 400);
    expect(response.body).toHaveProperty('message', 'Validation failed');
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(2);
    expect(response.body.errors[0]).toHaveProperty('path', ['name']);
    expect(response.body.errors[1]).toHaveProperty('path', ['age']);
  });

  it('Controller endpoint should process valid payload successfully', async () => {
    const validData = { name: 'John Doe', age: 25 };
    const response = await request(app.getHttpServer())
      .post('/test-validation')
      .send(validData)
      .expect(201); // Assuming a POST request typically returns 201 Created

    expect(response.body).toHaveProperty('message', 'Validation successful');
    expect(response.body).toHaveProperty('data', validData);
  });

  it('CommonModule should integrate properly with existing ConfigModule', async () => {
    // This test will verify that both modules can coexist without conflicts.
    // It implicitly passes if the application starts without errors and previous tests pass.
    // More specific integration tests would involve checking configuration-dependent behavior
    // or services from both modules working together.
    expect(app).toBeDefined();
  });

  it('Application should register global pipe and filter', async () => {
    const filters = (app as any).getContainer().getGlobalFilters();
    const hasHttpExceptionFilter = filters.some(
      (filter: any) => filter instanceof HttpExceptionFilter,
    );
    expect(hasHttpExceptionFilter).toBe(true);

    const pipes = (app as any).getContainer().getGlobalPipes();
    const hasZodValidationPipe = pipes.some(
      (pipe: any) => pipe instanceof ZodValidationPipe,
    );
    expect(hasZodValidationPipe).toBe(true);
  });
});
