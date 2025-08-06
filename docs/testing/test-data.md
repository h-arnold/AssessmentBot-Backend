# Test Data Management

This document provides comprehensive guidelines for managing test data and fixtures in the AssessmentBot-Backend project.

## Overview

Effective test data management ensures that tests are reliable, maintainable, and provide consistent results across different environments. The AssessmentBot-Backend uses a combination of static fixtures, dynamic generation, and carefully managed test environments.

## Test Data Philosophy

### Core Principles

- **Immutability**: Test data should be version-controlled and immutable
- **Realism**: Test data should reflect real-world usage scenarios
- **Isolation**: Tests should not interfere with each other's data
- **British English**: All test data uses British English spellings and conventions
- **Security**: No real API keys or sensitive data in test fixtures

### Data Categories

- **Static Fixtures**: JSON files and images for consistent test scenarios
- **Dynamic Generation**: Programmatically generated test data for edge cases
- **Mock Data**: Simulated external API responses
- **Environment Configuration**: Hardcoded test environment variables

## Static Test Data

### File Structure

Test data is organised in dedicated directories:

```
test/
├── data/                    # JSON test fixtures
│   ├── textTask.json       # Text-based assessment tasks
│   └── tableTask.json      # Table-based assessment tasks
├── ImageTasks/             # Image test fixtures
│   ├── referenceTask.png   # Reference image for assessment
│   ├── templateTask.png    # Template image for assessment
│   └── studentTask.png     # Student submission image
└── utils/                  # Test utilities and helpers
    ├── app-lifecycle.ts    # Application lifecycle management
    └── log-watcher.ts      # Log monitoring utilities
```

### JSON Test Fixtures

#### Text Task Example

```json
// test/data/textTask.json
{
  "taskType": "TEXT",
  "referenceTask": "Movement data - it can measure movement in all directions. Your steps, Heart rate, Sleep, Stress levels, Distance travelled, {any other valid and correct fitness tracker data}",
  "emptyTask": "Describe the types of data a fitness tracker can measure.",
  "studentTask": "Track our breathing, Blood, Oxygen, Heat"
}
```

#### Table Task Example

```json
// test/data/tableTask.json
{
  "taskType": "TABLE",
  "referenceTask": "| Page Name | What you will put on it |\n| Home Page | I will use content blocks with button links to connect to the some of the other pages. |\n| Technology behind self driving cars | I'll use content blocks to list each of the self driving car technologies with an image for each. |",
  "emptyTask": "| Page Name | What will that page cover? |\n| Home Page | Overview and navigation |\n| Self Driving Car Technology | Technologies and explanations |",
  "studentTask": "| Page Name | What will that page cover? |\n| Home Page | Navigation and links |\n| Self driving car technology. | Senses, cameras, lidar, radar, ultrasonic |"
}
```

### Loading Static Test Data

#### JSON Data Loading

```typescript
// Loading JSON fixtures in E2E tests
let tableData: TaskData;
let textData: TaskData;

beforeAll(async () => {
  const dataDir = path.join(__dirname, 'data');

  const tableTaskPath = path.join(dataDir, 'tableTask.json');
  const textTaskPath = path.join(dataDir, 'textTask.json');

  tableData = JSON.parse(await fs.readFile(tableTaskPath, 'utf-8'));
  textData = JSON.parse(await fs.readFile(textTaskPath, 'utf-8'));
});
```

#### Image Data Loading

```typescript
// Helper function for loading images as data URIs
const loadFileAsDataURI = async (filePath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  const mimeType =
    path.extname(filePath) === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
};

// Loading image fixtures
let referenceDataUri: string;
let templateDataUri: string;
let studentDataUri: string;

beforeAll(async () => {
  const imageDir = path.join(__dirname, 'ImageTasks');

  referenceDataUri = await loadFileAsDataURI(
    path.join(imageDir, 'referenceTask.png'),
  );
  templateDataUri = await loadFileAsDataURI(
    path.join(imageDir, 'templateTask.png'),
  );
  studentDataUri = await loadFileAsDataURI(
    path.join(imageDir, 'studentTask.png'),
  );
}, 20000); // Increased timeout for file loading
```

## Dynamic Test Data Generation

### Factory Functions

Create reusable factory functions for generating test data:

```typescript
// Test data factories
export class TestDataFactory {
  static createValidTextTask(): CreateAssessorDto {
    return {
      taskType: TaskType.TEXT,
      reference: 'Expected answer about photosynthesis',
      template: 'Explain the process of photosynthesis',
      studentResponse: 'Plants use sunlight to make food',
    };
  }

  static createValidTableTask(): CreateAssessorDto {
    return {
      taskType: TaskType.TABLE,
      reference: '| Column 1 | Column 2 |\n| Value A | Value B |',
      template: '| Column 1 | Column 2 |\n| Header A | Header B |',
      studentResponse: '| Column 1 | Column 2 |\n| Student A | Student B |',
    };
  }

  static createValidImageTask(): CreateAssessorDto {
    return {
      taskType: TaskType.IMAGE,
      reference: 'data:image/png;base64,iVBORw0KGgoAAAANS',
      template: 'data:image/png;base64,iVBORw0KGgoAAAANS',
      studentResponse: 'data:image/png;base64,iVBORw0KGgoAAAANS',
    };
  }

  static createInvalidTask(): Partial<CreateAssessorDto> {
    return {
      taskType: 'INVALID_TYPE' as TaskType,
      // Missing required fields
    };
  }
}
```

### Parameterised Test Data

Generate variations for comprehensive testing:

```typescript
// Generate test variations
export class TestVariationFactory {
  static generateTextTaskVariations(): CreateAssessorDto[] {
    const baseTask = TestDataFactory.createValidTextTask();

    return [
      baseTask,
      { ...baseTask, studentResponse: '' }, // Empty response
      { ...baseTask, studentResponse: 'Very short' }, // Minimal response
      { ...baseTask, studentResponse: 'A'.repeat(1000) }, // Long response
      { ...baseTask, template: 'Different question format' }, // Varied template
    ];
  }

  static generateEdgeCases(): Array<Partial<CreateAssessorDto>> {
    return [
      { taskType: null as any }, // Null task type
      { taskType: TaskType.TEXT, reference: null as any }, // Null reference
      {
        taskType: TaskType.TEXT,
        reference: '',
        template: '',
        studentResponse: '',
      }, // Empty strings
      { taskType: TaskType.IMAGE, reference: 'invalid-base64' }, // Invalid image data
    ];
  }
}
```

## Mock Data Management

### LLM Service Mocks

```typescript
// Mock LLM responses for different scenarios
export class MockLlmResponses {
  static readonly VALID_ASSESSMENT = JSON.stringify({
    completeness: 85,
    accuracy: 90,
    spag: 95,
    feedback: 'Well-structured response with good understanding',
  });

  static readonly POOR_ASSESSMENT = JSON.stringify({
    completeness: 45,
    accuracy: 50,
    spag: 60,
    feedback: 'Response lacks detail and contains some inaccuracies',
  });

  static readonly MALFORMED_RESPONSE = 'Invalid JSON response from LLM';

  static readonly QUOTA_EXHAUSTED_ERROR = {
    name: 'GoogleGenerativeAIFetchError',
    status: 429,
    message: 'RESOURCE_EXHAUSTED: Quota exceeded',
  };

  static getByScenario(scenario: string): string {
    switch (scenario) {
      case 'high_quality':
        return this.VALID_ASSESSMENT;
      case 'low_quality':
        return this.POOR_ASSESSMENT;
      case 'malformed':
        return this.MALFORMED_RESPONSE;
      default:
        return this.VALID_ASSESSMENT;
    }
  }
}
```

### Configuration Mocks

```typescript
// Mock configuration for different test scenarios
export class MockConfigData {
  static readonly DEFAULT_TEST_CONFIG = {
    GEMINI_API_KEY: 'test-key',
    NODE_ENV: 'test',
    PORT: 3000,
    API_KEYS: 'test-api-key-1,test-api-key-2',
    MAX_IMAGE_UPLOAD_SIZE_MB: 5,
    ALLOWED_IMAGE_MIME_TYPES: 'image/png,image/jpeg',
    LOG_LEVEL: 'debug',
    THROTTLER_TTL: 60,
    UNAUTHENTICATED_THROTTLER_LIMIT: 10,
    AUTHENTICATED_THROTTLER_LIMIT: 50,
  };

  static readonly STRICT_THROTTLING_CONFIG = {
    ...this.DEFAULT_TEST_CONFIG,
    UNAUTHENTICATED_THROTTLER_LIMIT: 2,
    AUTHENTICATED_THROTTLER_LIMIT: 5,
    THROTTLER_TTL: 10,
  };

  static readonly PERMISSIVE_CONFIG = {
    ...this.DEFAULT_TEST_CONFIG,
    MAX_IMAGE_UPLOAD_SIZE_MB: 50,
    ALLOWED_IMAGE_MIME_TYPES: 'image/png,image/jpeg,image/gif,image/webp',
  };
}
```

## Environment Data Management

### Test Environment Setup

Test environment variables are configured consistently across all tests:

```typescript
// jest.setup.ts - Global test environment
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// Load test environment if available
dotenv.config({ path: '.test.env' });

// Set consistent test environment
process.env.GEMINI_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.API_KEYS = 'test-api-key';
process.env.MAX_IMAGE_UPLOAD_SIZE_MB = '5';
process.env.ALLOWED_IMAGE_MIME_TYPES = 'image/png,image/jpeg';
process.env.LOG_LEVEL = 'debug';
process.env.THROTTLER_TTL = '60';
process.env.UNAUTHENTICATED_THROTTLER_LIMIT = '10';
process.env.AUTHENTICATED_THROTTLER_LIMIT = '50';
```

### E2E Environment Management

E2E tests use the app-lifecycle utility for consistent environment setup:

```typescript
// test/utils/app-lifecycle.ts - Environment injection
export async function startApp(
  logFilePath: string,
  envOverrides: Record<string, string> = {},
): Promise<AppInstance> {
  // Default values for test run
  const defaultTestValues = {
    NODE_ENV: 'test',
    PORT: '3001',
    E2E_TESTING: 'true',
    LOG_FILE: logFilePath,
    GEMINI_API_KEY: 'dummy-key-for-testing',
    API_KEYS: 'test-key-1,test-key-2',
    THROTTLER_TTL: '60',
    UNAUTHENTICATED_THROTTLER_LIMIT: '10',
    AUTHENTICATED_THROTTLER_LIMIT: '50',
    MAX_IMAGE_UPLOAD_SIZE_MB: '5',
    ALLOWED_IMAGE_MIME_TYPES: 'image/png,image/jpeg',
    LOG_LEVEL: 'error',
  };

  // Merge with overrides
  const finalEnv = { ...defaultTestValues, ...envOverrides };

  // Apply environment variables
  Object.entries(finalEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
}
```

## Test Data Cleanup and Isolation

### Data Isolation Strategies

```typescript
// Ensure tests don't interfere with each other
describe('Service Tests', () => {
  let service: ServiceUnderTest;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create fresh service instance
    service = new ServiceUnderTest();
  });

  afterEach(() => {
    // Clean up any side effects
    jest.restoreAllMocks();
  });
});
```

### Environment Reset

```typescript
// Reset environment between test suites
afterAll(() => {
  // Clean up environment variables
  delete process.env.TEST_SPECIFIC_VAR;

  // Reset to default values
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});
```

## Test Data Validation

### Schema Validation

Validate test data conforms to expected schemas:

```typescript
// Validate test fixtures against schemas
describe('Test Data Validation', () => {
  it('should validate text task fixture', () => {
    const textTaskData = require('../data/textTask.json');
    const result = createAssessorDtoSchema.safeParse(textTaskData);

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Text task validation errors:', result.error.issues);
    }
  });

  it('should validate table task fixture', () => {
    const tableTaskData = require('../data/tableTask.json');
    const result = createAssessorDtoSchema.safeParse(tableTaskData);

    expect(result.success).toBe(true);
  });
});
```

### Data Quality Checks

```typescript
// Verify test data quality
describe('Test Data Quality', () => {
  it('should use British English in test data', () => {
    const textTaskData = require('../data/textTask.json');

    // Check for British spellings
    expect(textTaskData.referenceTask).not.toMatch(/color|center|analyze/);
    expect(textTaskData.referenceTask).toMatch(/colour|centre|analyse/);
  });

  it('should have realistic content lengths', () => {
    const textTaskData = require('../data/textTask.json');

    expect(textTaskData.referenceTask.length).toBeGreaterThan(10);
    expect(textTaskData.referenceTask.length).toBeLessThan(1000);
  });
});
```

## Live API Testing Data

### Secure API Key Management

For tests that require real API calls:

```typescript
// Load real API key securely for live tests
const testEnvPath = path.join(__dirname, '..', '..', '.test.env');
const testEnvConfig = dotenv.parse(fs.readFileSync(testEnvPath));

// Override dummy key with real key if available
if (testEnvConfig.GEMINI_API_KEY) {
  finalEnv.GEMINI_API_KEY = testEnvConfig.GEMINI_API_KEY;
}
```

### Rate Limiting Considerations

```typescript
// Manage API rate limits in live tests
describe('Live API Tests', () => {
  beforeEach(async () => {
    // Add delay between tests to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('should handle real API calls', async () => {
    // Use realistic but minimal test data
    const minimalTask = {
      taskType: TaskType.TEXT,
      reference: 'Brief reference',
      template: 'Short question',
      studentResponse: 'Quick answer',
    };

    const result = await assessorService.assess(minimalTask);
    expect(result).toBeDefined();
  });
});
```

## Best Practices

### 1. Version Control

- **Commit test data**: All static test data should be version-controlled
- **No secrets**: Never commit real API keys or sensitive data
- **Documentation**: Document the purpose and structure of test data files

### 2. Maintenance

- **Regular review**: Periodically review test data for relevance and accuracy
- **British English**: Ensure all test data uses British English consistently
- **Realistic scenarios**: Keep test data reflective of real-world usage

### 3. Performance

- **Lazy loading**: Load test data only when needed
- **Caching**: Cache loaded test data to avoid repeated file I/O
- **Minimal data**: Use the smallest viable test data sets

### 4. Organisation

- **Clear naming**: Use descriptive names for test data files and variables
- **Logical grouping**: Organise test data by feature or test type
- **Documentation**: Include comments explaining complex test scenarios

This comprehensive test data management approach ensures that the AssessmentBot-Backend tests are reliable, maintainable, and provide accurate validation of system behaviour across different scenarios and environments.
