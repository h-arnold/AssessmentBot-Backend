import * as fs from 'fs';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import { AssessorService } from './../src/v1/assessor/assessor.service';
import { CreateAssessorDto, TaskType } from './../src/v1/assessor/dto/create-assessor.dto';

// Helper function to load a file and convert it to a data URI
const loadFileAsDataURI = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType =
    path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
};
describe('AssessorController (e2e)', () => {
  let app: INestApplication;
  let assessorService: AssessorService;
  let configService: ConfigService;
  let validApiKey: string;
  let createAssessmentSpy: jest.SpyInstance;
  // Load test data
  const textTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'textTask.json'), 'utf-8')
  );
  const tableTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'tableTask.json'), 'utf-8')
  );
  const imageTask = {
    taskType: TaskType.IMAGE,
    reference: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'referenceTask.png'),
    ),
    template: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'templateTask.png'),
    ),
    studentResponse: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'studentTask.png'),
    ),
  };
  beforeEach(async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ bodyParser: false });
    assessorService = moduleFixture.get<AssessorService>(AssessorService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    validApiKey = (configService.get('API_KEYS') as string[])[0];

    const mockLlmResponse = {
      completeness: { score: 5, reasoning: 'Perfect' },
      accuracy: { score: 4, reasoning: 'Good' },
      spag: { score: 3, reasoning: 'Okay' }
    };
    createAssessmentSpy = jest
      .spyOn(assessorService, 'createAssessment')
      .mockResolvedValue(mockLlmResponse);
    const payloadLimit = configService.getGlobalPayloadLimit();
    app.use(json({ limit: payloadLimit }));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Task Type Tests', () => {
    it('should process a valid TEXT task', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(textTask)
        .expect(201);
      expect(res.status).toBe(201);
      expect(createAssessmentSpy).toHaveBeenCalledWith(textTask);
    });
    it('should process a valid TABLE task', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(tableTask)
        .expect(201);
      expect(res.status).toBe(201);
      expect(createAssessmentSpy).toHaveBeenCalledWith(tableTask);
    });
    it('should process a valid IMAGE task', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(imageTask)
        .expect(201);
      expect(res.status).toBe(201);
      expect(createAssessmentSpy).toHaveBeenCalledWith(imageTask);
    });
  });

  describe('Auth and Validation', () => {
    it('/v1/assessor (POST) should return 401 Unauthorized when no API key is provided', async () => {
      await request(app.getHttpServer())
        .post('/v1/assessor')
        .send(textTask)
        .expect(401)
        .then((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
    });

    it('/v1/assessor (POST) should return 401 Unauthorized when an invalid API key is provided', async () => {
      await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', 'Bearer invalid-key')
        .send(textTask)
        .expect(401)
        .then((res) => {
          expect(res.body.message).toBe('Invalid API key');
        });
    });

    it('/v1/assessor (POST) should return 400 Bad Request for invalid DTO', async () => {
      const invalidPayload = { ...textTask, taskType: 'INVALID' };
      await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(invalidPayload)
        .expect(400)
        .then((res) => {
          expect(res.body.message).toBe('Validation failed');
        });
    });
  });

  it('/v1/assessor (POST) should return 201 Created for valid DTO and call service', async () => {
    const validPayload: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'test',
      template: 'test',
      studentResponse: 'test',
    };

    await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(validPayload)
      .expect(201)
      .then((res) => {
        expect(res.body).toEqual({
          completeness: { score: 5, reasoning: 'Perfect' },
          accuracy: { score: 4, reasoning: 'Good' },
          spag: { score: 3, reasoning: 'Okay' },
        });
      });

    expect(createAssessmentSpy).toHaveBeenCalledTimes(1);
    expect(createAssessmentSpy).toHaveBeenCalledWith(validPayload);


import * as fs from 'fs';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import { AssessorService } from './../src/v1/assessor/assessor.service';
import { CreateAssessorDto, TaskType } from './../src/v1/assessor/dto/create-assessor.dto';

// Helper function to load a file and convert it to a data URI
const loadFileAsDataURI = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType =
    path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
};


import * as fs from 'fs';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { json } from 'express';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from './../src/config/config.service';
import { AssessorService } from './../src/v1/assessor/assessor.service';
import {
  CreateAssessorDto,
  TaskType,
} from './../src/v1/assessor/dto/create-assessor.dto';

// Helper function to load a file and convert it to a data URI
const loadFileAsDataURI = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType =
    path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
};

describe('AssessorController (e2e)', () => {
  let app: INestApplication;
  let assessorService: AssessorService;
  let configService: ConfigService;
  let validApiKey: string;
  let createAssessmentSpy: jest.SpyInstance;

  // Load test data
  const textTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'textTask.json'), 'utf-8'),
  );
  const tableTask = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'tableTask.json'), 'utf-8'),
  );
  const imageTask = {
    taskType: TaskType.IMAGE,
    reference: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'referenceTask.png'),
    ),
    template: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'templateTask.png'),
    ),
    studentResponse: loadFileAsDataURI(
      path.join(__dirname, 'ImageTasks', 'studentTask.png'),
    ),
  };

  beforeEach(async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    assessorService = moduleFixture.get<AssessorService>(AssessorService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    validApiKey = (configService.get('API_KEYS') as string[])[0];

    const mockLlmResponse = {
      completeness: { score: 5, reasoning: 'Perfect' },
      accuracy: { score: 4, reasoning: 'Good' },
      spag: { score: 3, reasoning: 'Okay' },
    };

    createAssessmentSpy = jest
      .spyOn(assessorService, 'createAssessment')
      .mockResolvedValue(mockLlmResponse);

    const payloadLimit = configService.getGlobalPayloadLimit();
    app.use(json({ limit: payloadLimit }));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Task Type Tests', () => {
    it('should process a valid TEXT task', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(textTask)
        .expect(201);
      expect(res.status).toBe(201);
      expect(createAssessmentSpy).toHaveBeenCalledWith(textTask);
    });

    it('should process a valid TABLE task', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(tableTask)
        .expect(201);
      expect(res.status).toBe(201);
      expect(createAssessmentSpy).toHaveBeenCalledWith(tableTask);
    });

    it('should process a valid IMAGE task', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(imageTask)
        .expect(201);
      expect(res.status).toBe(201);
      expect(createAssessmentSpy).toHaveBeenCalledWith(imageTask);
    });
  });

  describe('Auth and Validation', () => {
    it('/v1/assessor (POST) should return 401 Unauthorized when no API key is provided', async () => {
      await request(app.getHttpServer())
        .post('/v1/assessor')
        .send(textTask)
        .expect(401)
        .then((res) => {
          expect(res.body.message).toBe('Unauthorized');
        });
    });

    it('/v1/assessor (POST) should return 401 Unauthorized when an invalid API key is provided', async () => {
      await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', 'Bearer invalid-key')
        .send(textTask)
        .expect(401)
        .then((res) => {
          expect(res.body.message).toBe('Invalid API key');
        });
    });

    it('/v1/assessor (POST) should return 400 Bad Request for invalid DTO', async () => {
      const invalidPayload = { ...textTask, taskType: 'INVALID' };
      await request(app.getHttpServer())
        .post('/v1/assessor')
        .set('Authorization', `Bearer ${validApiKey}`)
        .send(invalidPayload)
        .expect(400)
        .then((res) => {
          expect(res.body.message).toBe('Validation failed');
        });
    });
  });

  it('/v1/assessor (POST) should return 201 Created for valid DTO and call service', async () => {
    const validPayload: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'test',
      template: 'test',
      studentResponse: 'test',
    };

    await request(app.getHttpServer())
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${validApiKey}`)
      .send(validPayload)
      .expect(201)
      .then((res) => {
        expect(res.body).toEqual({
          completeness: { score: 5, reasoning: 'Perfect' },
          accuracy: { score: 4, reasoning: 'Good' },
          spag: { score: 3, reasoning: 'Okay' },
        });
      });

    expect(createAssessmentSpy).toHaveBeenCalledTimes(1);
    expect(createAssessmentSpy).toHaveBeenCalledWith(validPayload);
  });
});
}