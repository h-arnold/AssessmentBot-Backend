# Integration Testing

This document provides comprehensive guidelines for writing integration tests in the AssessmentBot-Backend project.

## Overview

Integration tests verify that different components work correctly together, focusing on the interactions between modules, services, and their dependencies. These tests use NestJS's `TestingModule` to create realistic testing environments while still maintaining control over external dependencies.

## Integration Testing Philosophy

### Purpose

- **Module Integration**: Verify that NestJS modules configure and wire dependencies correctly
- **Service Collaboration**: Test that services work together to fulfil business requirements
- **Configuration Validation**: Ensure that configuration and dependency injection work as expected
- **Contract Testing**: Verify that component interfaces work correctly together

### Scope

Integration tests sit between unit tests and E2E tests, providing:

- **More realistic than unit tests**: Use actual dependency injection and module configuration
- **More controlled than E2E tests**: Mock external boundaries but use real internal dependencies
- **Faster than E2E tests**: No need to start the full application

## Test Structure and Patterns

### Module Testing

Integration tests for NestJS modules verify proper dependency injection and configuration:

```typescript
// Example from src/auth/auth.module.spec.ts
describe('AuthModule', () => {
  let module: TestingModule;

  beforeAll(() => {
    // Set up test environment variables
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    process.env.API_KEYS = 'test-api-key';
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AuthModule,
        PassportModule.register({ defaultStrategy: 'bearer' }),
      ],
      providers: [
        ApiKeyStrategy,
        ApiKeyGuard,
        ApiKeyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: keyof Config) => {
              if (key === 'API_KEYS') {
                return ['test-key'];
              }
              return null;
            }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide ApiKeyService', () => {
    const apiKeyService = module.get<ApiKeyService>(ApiKeyService);
    expect(apiKeyService).toBeDefined();
    expect(apiKeyService).toBeInstanceOf(ApiKeyService);
  });

  it('should provide ApiKeyStrategy', () => {
    const apiKeyStrategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
    expect(apiKeyStrategy).toBeDefined();
    expect(apiKeyStrategy).toBeInstanceOf(ApiKeyStrategy);
  });

  it('should provide ApiKeyGuard', () => {
    const apiKeyGuard = module.get<ApiKeyGuard>(ApiKeyGuard);
    expect(apiKeyGuard).toBeDefined();
    expect(apiKeyGuard).toBeInstanceOf(ApiKeyGuard);
  });
});
```

### Service Integration Testing

Testing services with their real dependencies (but mocked external boundaries):

```typescript
// Example from src/v1/assessor/assessor.service.spec.ts
describe('AssessorService Integration', () => {
  let service: AssessorService;
  let llmService: LLMService;
  let promptFactory: PromptFactory;
  let jsonParser: JsonParserUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LlmModule,
        PromptModule,
        ConfigModule,
        LoggerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            pinoHttp: {
              level: configService.get('LOG_LEVEL'),
            },
          }),
        }),
      ],
      providers: [AssessorService, JsonParserUtil],
    })
      .overrideProvider(GeminiService)
      .useValue({
        send: jest.fn().mockResolvedValue('Mock LLM response'),
      })
      .compile();

    service = module.get<AssessorService>(AssessorService);
    llmService = module.get<LLMService>(LLMService);
    promptFactory = module.get<PromptFactory>(PromptFactory);
    jsonParser = module.get<JsonParserUtil>(JsonParserUtil);
  });

  it('should successfully integrate with PromptFactory and LLM service', async () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Expected answer',
      template: 'Question template',
      studentResponse: 'Student answer',
    };

    // Mock the LLM service response
    jest.spyOn(llmService, 'send').mockResolvedValue(
      JSON.stringify({
        score: 85,
        feedback: 'Good understanding demonstrated',
      }),
    );

    const result = await service.assess(dto);

    expect(result).toBeDefined();
    expect(promptFactory.create).toHaveBeenCalledWith(dto);
    expect(llmService.send).toHaveBeenCalled();
  });
});
```

### Configuration Integration

Testing that configuration modules work correctly with dependent services:

```typescript
// Example from src/config/config.module.spec.ts
describe('ConfigModule Integration', () => {
  let configService: ConfigService;
  let module: TestingModule;

  beforeAll(() => {
    // Set test environment variables
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.API_KEYS = 'key1,key2,key3';
    process.env.PORT = '3000';
    process.env.LOG_LEVEL = 'debug';
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should provide ConfigService with correct environment parsing', () => {
    expect(configService).toBeDefined();
    expect(configService.get('GEMINI_API_KEY')).toBe('test-gemini-key');
    expect(configService.get('API_KEYS')).toEqual(['key1', 'key2', 'key3']);
    expect(configService.get('PORT')).toBe(3000);
  });

  it('should integrate with other modules requiring configuration', async () => {
    const testModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        {
          provide: 'TEST_SERVICE',
          useFactory: (config: ConfigService) => ({
            apiKeys: config.get('API_KEYS'),
            port: config.get('PORT'),
          }),
          inject: [ConfigService],
        },
      ],
    }).compile();

    const testService = testModule.get('TEST_SERVICE');
    expect(testService.apiKeys).toEqual(['key1', 'key2', 'key3']);
    expect(testService.port).toBe(3000);
  });
});
```

## Testing Module Dependencies

### Complex Module Integration

For modules with multiple dependencies, test the complete integration:

```typescript
// Example from src/v1/assessor/assessor.module.spec.ts
describe('AssessorModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        AssessorModule,
        LoggerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            pinoHttp: {
              level: configService.get('LOG_LEVEL'),
            },
          }),
        }),
      ],
      providers: [Logger],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();
  });

  it('should provide all required services', () => {
    expect(module.get<AssessorController>(AssessorController)).toBeDefined();
    expect(module.get<AssessorService>(AssessorService)).toBeDefined();
    expect(module.get<PromptFactory>(PromptFactory)).toBeDefined();
  });

  it('should wire dependencies correctly', () => {
    const controller = module.get<AssessorController>(AssessorController);
    const service = module.get<AssessorService>(AssessorService);

    // Verify that controller has access to service
    expect(controller['assessorService']).toBe(service);
  });
});
```

### Cross-Module Integration

Testing integration between different feature modules:

```typescript
describe('LLM and Prompt Module Integration', () => {
  let llmService: LLMService;
  let promptFactory: PromptFactory;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LlmModule, PromptModule, ConfigModule],
    })
      .overrideProvider(GeminiService)
      .useValue({
        send: jest.fn(),
      })
      .compile();

    llmService = module.get<LLMService>(LLMService);
    promptFactory = module.get<PromptFactory>(PromptFactory);
  });

  it('should integrate prompt generation with LLM service', async () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'Reference text',
      template: 'Question template',
      studentResponse: 'Student response',
    };

    const prompt = promptFactory.create(dto);
    const generatedPrompt = prompt.generatePrompt();

    jest.spyOn(llmService, 'send').mockResolvedValue('Mock response');

    const result = await llmService.send(generatedPrompt);

    expect(result).toBe('Mock response');
    expect(llmService.send).toHaveBeenCalledWith(generatedPrompt);
  });
});
```

## Provider Override Patterns

### Service Mocking

Override external dependencies while keeping internal logic:

```typescript
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [FeatureModule],
  })
    .overrideProvider(ExternalService)
    .useValue({
      externalMethod: jest.fn().mockResolvedValue('mocked result'),
    })
    .overrideProvider(ConfigService)
    .useValue({
      get: jest.fn((key) => testConfig[key]),
    })
    .compile();
});
```

### Partial Mocking

Override only specific methods while keeping others:

```typescript
beforeEach(async () => {
  const realService = new RealService();
  const module: TestingModule = await Test.createTestingModule({
    imports: [FeatureModule],
  })
    .overrideProvider(RealService)
    .useValue({
      ...realService,
      externalMethod: jest.fn().mockResolvedValue('mocked'),
    })
    .compile();
});
```

## Testing Async Operations

### Promise-based Integration

Testing services that work with promises:

```typescript
it('should handle async service integration', async () => {
  const mockResponse = { score: 90, feedback: 'Excellent' };

  jest
    .spyOn(llmService, 'send')
    .mockResolvedValue(JSON.stringify(mockResponse));

  const result = await assessorService.assess(validDto);

  expect(result).toEqual(mockResponse);
  expect(llmService.send).toHaveBeenCalledWith(expect.any(String));
});
```

### Error Handling Integration

Testing error propagation between services:

```typescript
it('should handle errors from dependent services', async () => {
  const errorMessage = 'LLM service unavailable';

  jest.spyOn(llmService, 'send').mockRejectedValue(new Error(errorMessage));

  await expect(assessorService.assess(validDto)).rejects.toThrow(errorMessage);
});
```

## Database Integration (When Applicable)

While this project is stateless, here's how to test database integrations if needed:

```typescript
describe('Database Integration', () => {
  let module: TestingModule;
  let repository: Repository<Entity>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Entity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Entity]),
        FeatureModule,
      ],
    }).compile();

    repository = module.get<Repository<Entity>>(getRepositoryToken(Entity));
  });

  afterEach(async () => {
    await repository.clear();
  });
});
```

## Logger Integration Testing

Testing logging integration across modules:

```typescript
describe('Logger Integration', () => {
  let loggerSpy: jest.SpyInstance;
  let service: ServiceWithLogging;

  beforeEach(async () => {
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [FeatureModule],
      providers: [
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ServiceWithLogging>(ServiceWithLogging);
    loggerSpy = jest.spyOn(service['logger'], 'log');
  });

  it('should log operations correctly', async () => {
    await service.performOperation();

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Operation completed'),
    );
  });
});
```

## Testing Configuration Validation

Integration tests for configuration validation using Zod:

```typescript
describe('Configuration Validation Integration', () => {
  it('should validate complete configuration', () => {
    const validConfig = {
      GEMINI_API_KEY: 'valid-key',
      API_KEYS: ['key1', 'key2'],
      PORT: 3000,
      LOG_LEVEL: 'info',
    };

    expect(() => configSchema.parse(validConfig)).not.toThrow();
  });

  it('should reject invalid configuration', () => {
    const invalidConfig = {
      GEMINI_API_KEY: '', // Invalid empty string
      API_KEYS: 'not-an-array',
      PORT: 'not-a-number',
    };

    expect(() => configSchema.parse(invalidConfig)).toThrow();
  });
});
```

## Running Integration Tests

### Commands

```bash
# Run all tests (includes integration tests)
npm test

# Run specific integration test
npm test -- auth.module.spec.ts

# Run tests with specific pattern
npm test -- --testNamePattern="integration"

# Run with coverage
npm run test:cov
```

### Environment Setup

Integration tests use the same Jest configuration as unit tests but may require additional environment setup:

```typescript
// In jest.setup.ts or individual test files
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.API_KEYS = 'test-key-1,test-key-2';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
});
```

## Best Practices

### 1. Mock External Boundaries

Always mock external services but use real internal dependencies:

```typescript
// Good: Mock external LLM service
.overrideProvider(GeminiService)
.useValue({ send: jest.fn() })

// Good: Use real prompt factory
// Don't override PromptFactory - test real integration
```

### 2. Test Module Configuration

Verify that modules are configured correctly:

```typescript
it('should configure all required providers', () => {
  expect(module.get<RequiredService>(RequiredService)).toBeDefined();
  expect(module.get<AnotherService>(AnotherService)).toBeDefined();
});
```

### 3. Test Dependency Injection

Verify that dependencies are injected correctly:

```typescript
it('should inject dependencies correctly', () => {
  const service = module.get<ServiceWithDependencies>(ServiceWithDependencies);
  expect(service['dependency']).toBeDefined();
  expect(service['dependency']).toBeInstanceOf(DependencyClass);
});
```

### 4. Clean Test Environment

Ensure tests don't interfere with each other:

```typescript
afterEach(async () => {
  await module.close();
  jest.clearAllMocks();
});
```

Integration tests provide crucial confidence that the different parts of the AssessmentBot-Backend work correctly together, ensuring that the modular architecture functions as intended while maintaining the benefits of dependency injection and proper separation of concerns.
