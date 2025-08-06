# Prompt Testing

This guide covers comprehensive testing strategies for the prompt system, ensuring prompt effectiveness, reliability, and consistency across different assessment scenarios. The prompt system uses multiple testing layers to validate functionality and output quality.

## Testing Overview

The prompt system employs a multi-layered testing approach:

1. **Unit Tests** - Individual prompt class functionality
2. **Integration Tests** - Prompt factory and template loading
3. **End-to-End Tests** - Complete assessment workflow
4. **Effectiveness Testing** - LLM output quality validation
5. **Manual Testing** - Human validation of assessment accuracy

## Unit Testing

### Testing Prompt Classes

Each prompt implementation has comprehensive unit tests covering:

#### Constructor and Validation

```typescript
// Example from text.prompt.spec.ts
describe('TextPrompt', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  const validInput = {
    referenceTask: 'Reference text content',
    studentTask: 'Student text response',
    emptyTask: 'Empty template task',
  };

  it('should create TextPrompt instance successfully', () => {
    const prompt = new TextPrompt(validInput, logger);
    expect(prompt).toBeInstanceOf(TextPrompt);
  });

  it('should validate input schema correctly', () => {
    const invalidInput = { ...validInput, referenceTask: undefined };
    expect(() => new TextPrompt(invalidInput, logger)).toThrow(ZodError);
  });
});
```

#### Message Building

```typescript
describe('buildMessage', () => {
  it('should build valid LlmPayload', async () => {
    const prompt = new TextPrompt(validInput, logger);
    const message = await prompt.buildMessage();

    expect(message).toHaveProperty('system');
    expect(message).toHaveProperty('user');
    expect(typeof message.system).toBe('string');
    expect(typeof message.user).toBe('string');
    expect(message.system.length).toBeGreaterThan(0);
  });

  it('should render template variables correctly', async () => {
    const prompt = new TextPrompt(validInput, logger);
    const message = await prompt.buildMessage();

    expect(message.user).toContain(validInput.referenceTask);
    expect(message.user).toContain(validInput.studentTask);
    expect(message.user).toContain(validInput.emptyTask);
  });
});
```

### Testing Template Loading

Templates are tested using mocked filesystem operations:

```typescript
// Mock fs to control template content
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

beforeAll(async () => {
  // Load real templates for testing
  const realFs = require('fs');
  systemTemplate = realFs.readFileSync(
    path.join(process.cwd(), 'src/prompt/templates/text.system.prompt.md'),
    { encoding: 'utf-8' },
  );

  // Mock fs.readFile to return controlled content
  (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
    if (filePath.includes('text.system.prompt.md')) {
      return Promise.resolve(systemTemplate);
    }
    return Promise.reject(new Error('File not found'));
  });
});
```

### Error Handling Tests

```typescript
describe('Error Handling', () => {
  it('should handle missing template files gracefully', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

    const prompt = new TextPrompt(validInput, logger);
    await expect(prompt.buildMessage()).rejects.toThrow('File not found');
  });

  it('should validate input data types', () => {
    const invalidInput = { referenceTask: 123, studentTask: 'valid' };
    expect(() => new TextPrompt(invalidInput, logger)).toThrow();
  });
});
```

## Integration Testing

### Factory Pattern Testing

The `PromptFactory` has comprehensive tests for prompt creation:

```typescript
// From prompt.factory.spec.ts
describe('PromptFactory', () => {
  let factory: PromptFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptFactory, Logger],
    }).compile();
    factory = module.get<PromptFactory>(PromptFactory);
  });

  it('should create TextPrompt for TEXT task type', async () => {
    const dto: CreateAssessorDto = {
      taskType: TaskType.TEXT,
      reference: 'ref',
      studentResponse: 'stud',
      template: 'temp',
    };

    const prompt = await factory.create(dto);
    expect(prompt).toBeInstanceOf(TextPrompt);
  });

  it('should throw error for unsupported task type', async () => {
    const dto = { taskType: 'INVALID' } as unknown as CreateAssessorDto;
    await expect(factory.create(dto)).rejects.toThrow(
      'Unsupported task type: INVALID',
    );
  });
});
```

### Template Resolution Testing

```typescript
describe('Template Loading', () => {
  it('should load correct templates for each task type', async () => {
    const textDto = { taskType: TaskType.TEXT /* ... */ };
    const tableDto = { taskType: TaskType.TABLE /* ... */ };

    const textPrompt = await factory.create(textDto);
    const tablePrompt = await factory.create(tableDto);

    const textMessage = await textPrompt.buildMessage();
    const tableMessage = await tablePrompt.buildMessage();

    // Verify different system prompts loaded
    expect(textMessage.system).not.toBe(tableMessage.system);
  });
});
```

## End-to-End Testing

### Full Assessment Workflow

End-to-end tests validate the complete assessment pipeline:

```typescript
// From assessor.e2e-spec.ts
describe('AssessorController (e2e)', () => {
  let app: AppInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  it('/v1/assessor (POST) should process TEXT assessment', async () => {
    const validPayload = {
      taskType: 'TEXT',
      reference: 'Reference solution text',
      template: 'Task template',
      studentResponse: 'Student response text',
    };

    const response = await request(app.appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${app.apiKey}`)
      .send(validPayload)
      .expect(201);

    // Validate response structure
    expect(response.body).toHaveProperty('completeness');
    expect(response.body).toHaveProperty('accuracy');
    expect(response.body).toHaveProperty('spag');

    // Validate score ranges
    expect(response.body.completeness.score).toBeGreaterThanOrEqual(0);
    expect(response.body.completeness.score).toBeLessThanOrEqual(5);
  });
});
```

### Authentication and Validation

```typescript
describe('Auth and Validation', () => {
  it('should reject requests without API key', async () => {
    await request(app.appUrl)
      .post('/v1/assessor')
      .send(validPayload)
      .expect(401);
  });

  it('should validate DTO structure', async () => {
    const invalidPayload = { taskType: 'INVALID' };
    await request(app.appUrl)
      .post('/v1/assessor')
      .set('Authorization', `Bearer ${app.apiKey}`)
      .send(invalidPayload)
      .expect(400);
  });
});
```

## Test Data Management

### Structured Test Data

Test data is organised in JSON files for consistency:

```json
// test/data/textTask.json
{
  "referenceTask": "Comprehensive reference solution...",
  "studentTask": "Partial student response...",
  "emptyTask": "Original task template..."
}
```

### Dynamic Test Data Generation

```typescript
const generateTestData = (scoreLevel: 'low' | 'medium' | 'high') => {
  const baseData = {
    taskType: 'TEXT',
    template: 'Write an essay about climate change.',
  };

  switch (scoreLevel) {
    case 'low':
      return {
        ...baseData,
        reference: 'Comprehensive climate change essay with evidence...',
        studentResponse: 'Climate change is bad.',
      };
    case 'high':
      return {
        ...baseData,
        reference: 'Good climate change essay...',
        studentResponse: 'Comprehensive response matching reference quality...',
      };
  }
};
```

## Effectiveness Testing

### LLM Output Validation

Testing prompt effectiveness requires validating LLM responses:

```typescript
describe('Prompt Effectiveness', () => {
  it('should produce consistent scores for identical content', async () => {
    const testCases = Array(5).fill(sameContent);
    const results = await Promise.all(
      testCases.map((content) => assessmentService.assess(content)),
    );

    // Check score consistency (within tolerance)
    const scores = results.map((r) => r.completeness.score);
    const variance = calculateVariance(scores);
    expect(variance).toBeLessThan(0.5); // Acceptable variance threshold
  });

  it('should distinguish between different quality levels', async () => {
    const highQuality = generateTestData('high');
    const lowQuality = generateTestData('low');

    const highResult = await assessmentService.assess(highQuality);
    const lowResult = await assessmentService.assess(lowQuality);

    expect(highResult.completeness.score).toBeGreaterThan(
      lowResult.completeness.score,
    );
  });
});
```

### JSON Response Validation

```typescript
describe('Response Format Validation', () => {
  it('should always return valid JSON structure', async () => {
    const response = await assessmentService.assess(testData);

    // Validate required fields
    expect(response).toHaveProperty('completeness');
    expect(response).toHaveProperty('accuracy');
    expect(response.completeness).toHaveProperty('score');
    expect(response.completeness).toHaveProperty('reasoning');

    // Validate data types
    expect(typeof response.completeness.score).toBe('number');
    expect(typeof response.completeness.reasoning).toBe('string');
  });
});
```

## Performance Testing

### Template Loading Performance

```typescript
describe('Performance', () => {
  it('should load templates within acceptable time', async () => {
    const startTime = Date.now();

    await factory.create(testDto);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100); // 100ms threshold
  });

  it('should handle concurrent prompt creation', async () => {
    const concurrentRequests = Array(10).fill(testDto);

    const startTime = Date.now();
    await Promise.all(concurrentRequests.map((dto) => factory.create(dto)));
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // 1 second for 10 concurrent requests
  });
});
```

## Manual Testing Procedures

### Quality Assurance Testing

For critical template changes, perform manual validation:

1. **Score Consistency Check**
   - Test identical content multiple times
   - Verify score variance is minimal
   - Document any inconsistencies

2. **Edge Case Validation**

   ```typescript
   const edgeCases = [
     { name: 'Empty student response', studentTask: '' },
     { name: 'Extremely long response', studentTask: 'A'.repeat(10000) },
     { name: 'Special characters', studentTask: '!@#$%^&*()' },
     { name: 'Non-English content', studentTask: 'Bonjour le monde' },
   ];
   ```

3. **Cross-Task Type Consistency**
   - Ensure similar content quality receives similar scores across task types
   - Validate assessment criteria alignment

### Human Validation

For new templates or major changes:

1. **Expert Review**: Subject matter experts validate assessment criteria
2. **Sample Assessment**: Manual scoring of test cases for comparison
3. **Calibration**: Adjust templates based on human expert feedback

## Testing Best Practices

### Test Organization

- **Co-location**: Keep test files near source code
- **Naming**: Use descriptive test names that explain what's being tested
- **Setup/Teardown**: Proper test isolation and cleanup

### Mock Strategy

```typescript
// Good: Mock external dependencies, test actual logic
jest.mock('fs/promises');
jest.mock('../llm/llm.service');

// Avoid: Over-mocking internal logic you want to test
```

### Test Data

- **Realistic Data**: Use realistic assessment content in tests
- **Edge Cases**: Include boundary conditions and error cases
- **Consistency**: Maintain consistent test data across test suites

### Continuous Integration

- **Automated Testing**: All tests run on every commit
- **Coverage Requirements**: Maintain high test coverage (>90%)
- **Performance Monitoring**: Track test execution time trends

This comprehensive testing approach ensures prompt reliability, effectiveness, and maintainability across all supported assessment task types.
