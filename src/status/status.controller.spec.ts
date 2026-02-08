import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { StatusController } from './status.controller';
import { StatusService, HealthCheckResponse } from './status.service';

describe('StatusController', () => {
  let controller: StatusController;
  let service: StatusService;

  beforeEach(async () => {
    const healthResponse: HealthCheckResponse = {
      status: 'ok',
      version: '1.0.0',
      timestamp: '2024-01-01T00:00:00.000Z',
      systemInfo: {
        platform: 'linux',
        arch: 'x64',
        release: 'test-release',
        uptime: 123,
        hostname: 'test-host',
        totalMemory: 1024,
        freeMemory: 512,
        cpus: 4,
      },
    };

    const mockStatusService = {
      getHello: jest.fn().mockReturnValue('Hello World!'),
      getHealth: jest.fn().mockReturnValue(healthResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusController],
      providers: [
        {
          provide: StatusService,
          useValue: mockStatusService,
        },
      ],
    }).compile();

    controller = module.get<StatusController>(StatusController);
    service = module.get<StatusService>(StatusService);
  });

  describe('getHello', () => {
    it('should return a hello message', () => {
      expect(controller.getHello()).toBe('Hello World!');
      expect(service.getHello).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health check response', () => {
      expect(controller.getHealth()).toEqual(
        expect.objectContaining({
          status: 'ok',
          version: '1.0.0',
          timestamp: '2024-01-01T00:00:00.000Z',
          systemInfo: expect.objectContaining({
            platform: 'linux',
            arch: 'x64',
            release: 'test-release',
            uptime: 123,
            hostname: 'test-host',
            totalMemory: 1024,
            freeMemory: 512,
            cpus: 4,
          }),
        }),
      );
      expect(service.getHealth).toHaveBeenCalled();
    });
  });

  describe('testError', () => {
    it('should throw an HttpException with the correct message', () => {
      expect(() => controller.testError()).toThrow('This is a test error');
    });

    it('should throw an HttpException', () => {
      expect(() => controller.testError()).toThrow(HttpException);
    });
  });
});
