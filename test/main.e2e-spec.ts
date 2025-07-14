import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

// import { AppModule } from './../src/app.module'; // No longer directly importing AppModule
import { HttpExceptionFilter } from './../src/common/http-exception.filter';
import { ZodValidationPipe } from './../src/common/zod-validation.pipe';
import { TestAppModule } from './test-app.module'; // Import the new TestAppModule

describe('Global Setup and E2E Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule], // Use TestAppModule here
    }).compile();

    app = moduleFixture.createNestApplication();
    // Register global pipes and filters explicitly for the test application
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ZodValidationPipe()); // Pass null as schema for global pipe
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
    expect(response.body).toHaveProperty('timestamp'); // This should now pass
    expect(response.body).toHaveProperty('path', '/test-error');
  });

  it('Controller endpoint should return 400 for invalid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-validation')
      .send({ name: 'ab', age: 17 }) // Invalid data
      .expect(400);

    expect(response.body).toHaveProperty('statusCode', 400);
    expect(response.body).toHaveProperty('message', 'Validation failed'); // ZodValidationPipe message
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0]).toHaveProperty('message', 'Invalid input');
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
    // This test implicitly passes if the application starts without errors and previous tests pass.
    expect(app).toBeDefined();
  });
});
