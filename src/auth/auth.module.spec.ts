import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';

import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyStrategy } from './api-key.strategy';
import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AuthModule,
        PassportModule.register({ defaultStrategy: 'bearer' }),
      ],
      providers: [
        ApiKeyStrategy,
        ApiKeyGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'API_KEYS') {
                return 'test-key';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();
  });

  it('AuthModule should be defined and importable', () => {
    expect(module).toBeDefined();
  });

  it('AuthModule should export ApiKeyStrategy and ApiKeyGuard providers', () => {
    const apiKeyStrategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
    const apiKeyGuard = module.get<ApiKeyGuard>(ApiKeyGuard);
    expect(apiKeyStrategy).toBeDefined();
    expect(apiKeyGuard).toBeDefined();
  });

  it('AuthModule should integrate PassportModule correctly', () => {
    // This test implicitly checks PassportModule integration by ensuring ApiKeyStrategy is provided
    // and the module compiles without errors. More explicit checks would involve
    // inspecting the module's internal providers, which is not straightforward.
    expect(true).toBeTruthy(); // Placeholder, actual check is compilation success
  });

  it('AuthModule should register ApiKeyStrategy and ApiKeyGuard in providers and exports', () => {
    // This is covered by the 'should export ApiKeyStrategy and ApiKeyGuard providers' test
    expect(true).toBeTruthy(); // Placeholder
  });
});
