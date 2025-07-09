import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ApiKeyService } from './api-key.service';
import { ApiKeyStrategy } from './api-key.strategy';
import { User } from './user.interface';

const mockApiKeyService = {
  validate: jest.fn(),
};

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
      ],
    }).compile();

    strategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return the user object when authentication is successful', async () => {
      const user: User = { apiKey: 'test-key' };
      const token = 'valid-api-key';

      mockApiKeyService.validate.mockResolvedValue(user);

      const result = await strategy.validate(token);

      expect(mockApiKeyService.validate).toHaveBeenCalledWith(token);
      expect(result).toEqual(user);
    });

    it('should throw an UnauthorizedException if authentication fails', async () => {
      const token = 'invalid-api-key';

      mockApiKeyService.validate.mockResolvedValue(null);

      await expect(strategy.validate(token)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockApiKeyService.validate).toHaveBeenCalledWith(token);
    });
  });
});
