# Unit Testing

This document provides comprehensive guidelines and examples for writing unit tests in the AssessmentBot-Backend project.

## Overview

Unit tests form the foundation of our testing strategy, focusing on testing individual components in complete isolation. Each unit test should be fast, reliable, and independent of external dependencies.

## Unit Testing Principles

### 1. Isolation

- Test components in complete isolation from their dependencies
- Mock all external dependencies including services, APIs, and file system operations
- Use NestJS `TestingModule` for dependency injection testing

### 2. Single Responsibility

- Each test should verify one specific behaviour or requirement
- Test method names should clearly describe the expected behaviour
- Follow the Arrange-Act-Assert pattern

### 3. Determinism

- Tests must produce consistent results across different environments
- Avoid time-dependent logic and random data generation
- Use fixed test data and predictable mock responses

## File Structure and Naming

### Location

Unit test files are co-located with their source files using the `.spec.ts` extension:

```
src/
├── auth/
│   ├── api-key.service.ts
│   └── api-key.service.spec.ts      # Unit tests for ApiKeyService
├── common/
│   ├── zod-validation.pipe.ts
│   └── zod-validation.pipe.spec.ts  # Unit tests for ZodValidationPipe
└── v1/assessor/
    ├── assessor.service.ts
    └── assessor.service.spec.ts      # Unit tests for AssessorService
```

### Naming Conventions

- Test files: `{component-name}.spec.ts`
- Test suites: Describe the component being tested
- Test cases: Use British English with clear behaviour descriptions

## Basic Test Structure

### Standard Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

import { ComponentUnderTest } from './component-under-test';
import { DependencyService } from './dependency.service';

describe('ComponentUnderTest', () => {
  let component: ComponentUnderTest;
  let dependencyService: DependencyService;

  beforeEach(async () => {
    const mockDependencyService = {
      method: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentUnderTest,
        {
          provide: DependencyService,
          useValue: mockDependencyService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    component = module.get<ComponentUnderTest>(ComponentUnderTest);
    dependencyService = module.get<DependencyService>(DependencyService);
  });

  it('should be defined', () => {
    expect(component).toBeDefined();
  });

  // Additional test cases...
});
```

## Testing Patterns and Examples

### 1. Service Testing

Testing services with dependency injection:

```typescript
// Example from src/auth/api-key.service.spec.ts
describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: keyof Config) => {
              if (key === 'API_KEYS') {
                return ['valid-key-1', 'valid-key-2'];
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
          },
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should accept a valid API key and return user context', () => {
    const result = service.validate('valid-key-1');
    expect(result).toEqual({ apiKey: 'valid-key-1' });
  });

  it('should throw UnauthorizedException for invalid API key', () => {
    expect(() => service.validate('invalid-key')).toThrow(
      UnauthorizedException,
    );
  });
});
```

### 2. Pipe Testing

Testing validation pipes with Zod schemas:

```typescript
// Example from src/common/zod-validation.pipe.spec.ts
describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string(),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('should return transformed data on valid payload', () => {
    const validData = { name: 'test' };
    expect(pipe.transform(validData, {} as ArgumentMetadata)).toEqual(
      validData,
    );
  });

  it('should throw BadRequestException on invalid data', () => {
    const invalidData = { name: 123 };
    expect(() => pipe.transform(invalidData, {} as ArgumentMetadata)).toThrow(
      BadRequestException,
    );
  });

  it('should handle edge cases for empty and null values', () => {
    expect(() => pipe.transform(null, {} as ArgumentMetadata)).toThrow(
      BadRequestException,
    );
    expect(() => pipe.transform(undefined, {} as ArgumentMetadata)).toThrow(
      BadRequestException,
    );
  });
});
```

### 3. DTO Testing

Testing Data Transfer Objects with Zod validation:

```typescript
// Example from src/v1/assessor/dto/create-assessor.dto.spec.ts
describe('CreateAssessorDto', () => {
  describe('Validation', () => {
    it('should accept a valid TEXT task payload', () => {
      const validPayload: CreateAssessorDto = {
        taskType: TaskType.TEXT,
        reference: 'Sample reference text',
        template: 'Sample template text',
        studentResponse: 'Sample student response',
      };
      const result = createAssessorDtoSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject payload with missing required fields', () => {
      const invalidPayload = {
        taskType: TaskType.TEXT,
        // Missing required fields
      };
      const result = createAssessorDtoSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3); // reference, template, studentResponse
      }
    });

    it('should reject payload with invalid taskType', () => {
      const invalidPayload = {
        taskType: 'INVALID_TYPE',
        reference: 'Sample reference',
        template: 'Sample template',
        studentResponse: 'Sample response',
      };
      const result = createAssessorDtoSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
```

### 4. Factory Testing

Testing factory pattern implementations:

```typescript
// Example from src/prompt/prompt.factory.spec.ts
describe('PromptFactory', () => {
  let factory: PromptFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptFactory, Logger],
    }).compile();

    factory = module.get<PromptFactory>(PromptFactory);
  });

  it("should return a TextPrompt for taskType 'TEXT'", () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'reference',
      template: 'template',
      studentResponse: 'response',
    };
    const prompt = factory.create(dto);
    expect(prompt).toBeInstanceOf(TextPrompt);
  });

  it("should return an ImagePrompt for taskType 'IMAGE'", () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.IMAGE,
      reference: 'data:image/png;base64,iVBORw0KGgoAAAANS',
      template: 'data:image/png;base64,iVBORw0KGgoAAAANS',
      studentResponse: 'data:image/png;base64,iVBORw0KGgoAAAANS',
    };
    const prompt = factory.create(dto);
    expect(prompt).toBeInstanceOf(ImagePrompt);
  });
});
```

## Mocking Strategies

### 1. Service Mocking

Use Jest mocks for external dependencies:

```typescript
const mockLlmService = {
  send: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mock response' } }],
  }),
};

const mockConfigService = {
  get: jest.fn((key) => {
    const config = {
      API_KEYS: ['test-key'],
      LOG_LEVEL: 'debug',
    };
    return config[key];
  }),
};
```

### 2. Logger Mocking

Standardised logger mock for consistent testing:

```typescript
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};
```

### 3. Complex Object Mocking

For complex dependencies, create comprehensive mocks:

```typescript
const mockPromptFactory = {
  create: jest.fn().mockImplementation((dto) => {
    const mockPrompt = {
      generatePrompt: jest.fn().mockReturnValue('Generated prompt'),
      getImages: jest.fn().mockReturnValue([]),
    };
    return mockPrompt;
  }),
};
```

## Testing Edge Cases

### 1. Error Handling

Test all error scenarios thoroughly:

```typescript
it('should handle ResourceExhaustedError appropriately', () => {
  const originalError = new Error('RESOURCE_EXHAUSTED: Quota exceeded');
  const resourceError = new ResourceExhaustedError(
    'API quota exhausted. Please try again later.',
    originalError,
  );

  expect(resourceError).toBeInstanceOf(ResourceExhaustedError);
  expect(resourceError.originalError).toBe(originalError);
  expect(resourceError.message).toContain('quota exhausted');
});
```

### 2. Boundary Values

Test boundary conditions and edge values:

```typescript
it('should handle empty arrays correctly', () => {
  const result = arrayPipe.transform([], {} as ArgumentMetadata);
  expect(result).toEqual([]);
});

it('should reject arrays with invalid items', () => {
  expect(() =>
    arrayPipe.transform(['valid', 123, 'valid'], {} as ArgumentMetadata),
  ).toThrow(BadRequestException);
});
```

### 3. Null and Undefined Values

Always test null and undefined scenarios:

```typescript
it('should handle null and undefined values appropriately', () => {
  expect(() => pipe.transform(null, {} as ArgumentMetadata)).toThrow(
    BadRequestException,
  );
  expect(() => pipe.transform(undefined, {} as ArgumentMetadata)).toThrow(
    BadRequestException,
  );
});
```

## Test Environment Setup

### Jest Configuration

Unit tests use the main Jest configuration (`jest.config.js`):

```javascript
export default {
  setupFiles: ['<rootDir>/jest.setup.ts'],
  preset: 'ts-jest/presets/default-esm',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  // Additional configuration...
};
```

### Environment Variables

Test environment variables are configured in `jest.setup.ts`:

```typescript
process.env.GEMINI_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';
process.env.API_KEYS = 'test-api-key';
process.env.LOG_LEVEL = 'debug';
```

## Running Unit Tests

### Basic Commands

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- auth/api-key.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should validate"
```

### Debugging Tests

```bash
# Debug tests with Node.js inspector
npm run test:debug

# Run single test file for debugging
npm test -- --runInBand auth/api-key.service.spec.ts
```

## Best Practices

### 1. Test Descriptions

Use clear, behaviour-driven descriptions:

```typescript
// Good
it('should return user context when API key is valid', () => {});
it('should throw UnauthorizedException when API key is invalid', () => {});

// Poor
it('should work', () => {});
it('should test validation', () => {});
```

### 2. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('should calculate correct assessment score', () => {
  // Arrange
  const referenceAnswer = 'Correct answer';
  const studentResponse = 'Student answer';

  // Act
  const result = assessorService.calculateScore(
    referenceAnswer,
    studentResponse,
  );

  // Assert
  expect(result.score).toBeGreaterThan(0);
  expect(result.feedback).toBeDefined();
});
```

### 3. Test Data Management

Use descriptive test data:

```typescript
const validTextTask = {
  taskType: TaskType.TEXT,
  reference: 'Expected answer about photosynthesis',
  template: 'Explain the process of photosynthesis',
  studentResponse: 'Plants use sunlight to make food',
};
```

### 4. Error Message Testing

Verify specific error messages:

```typescript
it('should provide helpful error message for invalid input', () => {
  expect(() => validator.validate(invalidInput)).toThrow(
    'Task type must be one of: TEXT, TABLE, IMAGE',
  );
});
```

This comprehensive unit testing approach ensures reliable, maintainable, and well-documented test coverage for all components in the AssessmentBot-Backend system.
