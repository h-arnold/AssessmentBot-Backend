# Design Patterns

This document catalogues the design patterns used throughout the AssessmentBot-Backend codebase, explaining their implementation, benefits, and specific use cases within the system.

## Creational Patterns

### Factory Pattern

**Implementation**: `PromptFactory` (`src/prompt/prompt.factory.ts`)

The Factory pattern is used to create task-specific prompt instances based on the type of assessment being performed.

```typescript
// Factory creates different prompt types based on task type
class PromptFactory {
  async create(dto: CreateAssessorDto): Promise<Prompt> {
    switch (dto.taskType) {
      case TaskType.TEXT:
        return new TextPrompt(
          inputs,
          this.logger,
          userTemplateFile,
          systemPrompt,
        );
      case TaskType.TABLE:
        return new TablePrompt(
          inputs,
          this.logger,
          userTemplateFile,
          systemPrompt,
        );
      case TaskType.IMAGE:
        return new ImagePrompt(inputs, this.logger, systemPrompt);
      default:
        throw new Error(`Unsupported task type: ${dto.taskType}`);
    }
  }
}
```

**Benefits**:

- Encapsulates object creation logic
- Allows adding new prompt types without modifying existing code
- Centralises task type determination logic
- Provides consistent initialisation for all prompt types

**Usage Pattern**:

```typescript
// In AssessorService
const prompt = await this.promptFactory.create(dto);
const message = await prompt.buildMessage();
```

### Provider Pattern (Dependency Injection)

**Implementation**: NestJS Dependency Injection Container

The Provider pattern is extensively used throughout the application via NestJS's dependency injection system.

```typescript
// LLM Module uses provider pattern to map interface to implementation
@Module({
  providers: [
    GeminiService,
    {
      provide: LLMService, // Interface token
      useClass: GeminiService, // Concrete implementation
    },
  ],
  exports: [LLMService],
})
export class LlmModule {}
```

**Benefits**:

- Loose coupling between components
- Easy testing with mock implementations
- Centralized dependency management
- Support for different implementations without code changes

**Key Implementations**:

- `LLMService` → `GeminiService` mapping
- `ConfigService` providing configuration throughout the app
- `Logger` instances for each class

## Structural Patterns

### Strategy Pattern

**Implementation**: LLM Service Abstraction (`src/llm/llm.service.interface.ts`)

The Strategy pattern allows interchangeable LLM providers through a common interface.

```typescript
// Abstract base class defines the strategy interface
@Injectable()
export abstract class LLMService {
  async send(payload: LlmPayload): Promise<LlmResponse> {
    // Common retry logic implementation
    return await this._sendInternal(payload);
  }

  // Strategy-specific implementation
  protected abstract _sendInternal(payload: LlmPayload): Promise<LlmResponse>;
}

// Concrete strategy for Google Gemini
@Injectable()
export class GeminiService extends LLMService {
  protected async _sendInternal(payload: LlmPayload): Promise<LlmResponse> {
    // Gemini-specific implementation
  }
}
```

**Benefits**:

- Easy to add new LLM providers (OpenAI, Claude, etc.)
- Common retry and error handling logic
- Runtime provider switching capability
- Consistent interface for all LLM interactions

### Template Method Pattern

**Implementation**: Prompt Base Class (`src/prompt/prompt.base.ts`)

The Template Method pattern defines the skeleton of prompt creation while allowing subclasses to customize specific steps.

```typescript
// Base class defines the template algorithm
export abstract class Prompt {
  constructor(
    inputs: unknown,
    logger: Logger,
    userTemplateName?: string,
    systemPrompt?: string,
  ) {
    // Template method steps
    const parsed = PromptInputSchema.parse(inputs); // 1. Validate
    this.setInputs(parsed); // 2. Set inputs
    this.setConfiguration(userTemplateName, systemPrompt); // 3. Configure
    this.logInputLengths(parsed); // 4. Log
  }

  // Default implementation - can be overridden
  public async buildMessage(): Promise<LlmPayload> {
    // Standard text/table prompt building
  }
}

// Subclasses can override specific behaviour
export class ImagePrompt extends Prompt {
  // Override message building for images
  public async buildMessage(): Promise<LlmPayload> {
    // Image-specific implementation
  }
}
```

**Benefits**:

- Consistent prompt creation process
- Shared validation and logging logic
- Flexibility for task-specific customization
- Code reuse across prompt types

### Adapter Pattern

**Implementation**: Configuration Module (`src/config/config.module.ts`)

The Adapter pattern wraps NestJS's built-in configuration module to provide a consistent, validated interface.

```typescript
// Adapter wraps NestJS ConfigModule
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: '.env',
    }),
  ],
  providers: [ConfigService], // Our custom adapter
  exports: [ConfigService], // Hide NestJS ConfigModule
})
export class ConfigModule {}

// ConfigService adapts raw environment variables to validated config
@Injectable()
export class ConfigService {
  private config: Config;

  constructor() {
    // Adapt raw process.env to validated config
    this.config = configSchema.parse(process.env);
  }
}
```

**Benefits**:

- Hides complexity of underlying configuration system
- Provides type-safe configuration access
- Centralises validation logic
- Consistent interface across the application

## Behavioral Patterns

### Guard Pattern

**Implementation**: Authentication and Authorisation (`src/auth/`)

The Guard pattern protects routes by intercepting requests and checking authentication/authorization.

```typescript
// Guard intercepts requests before reaching controllers
@Injectable()
export class ApiKeyGuard extends AuthGuard('bearer') {
  // Inherits request interception logic
}

// Strategy defines how authentication is performed
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'bearer') {
  async validate(req: Request, apiKey: string): Promise<User> {
    // Custom validation logic
  }
}

// Usage in controllers
@Controller('v1/assessor')
@UseGuards(ApiKeyGuard) // Guard protects all routes in this controller
export class AssessorController {
  // Protected endpoints
}
```

**Benefits**:

- Separation of authentication from business logic
- Reusable across multiple controllers
- Consistent security enforcement
- Easy to test and modify authentication logic

### Pipe Pattern

**Implementation**: Validation Pipes (`src/common/zod-validation.pipe.ts`)

The Pipe pattern transforms and validates input data as it flows through the system.

```typescript
// Pipe transforms and validates input
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema?: ZodTypeAny) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (!this.schema) return value;

    try {
      return this.schema.parse(value);  // Transform and validate
    } catch (error) {
      throw new BadRequestException(/* validation errors */);
    }
  }
}

// Usage in controllers
@Post()
async create(
  @Body(new ZodValidationPipe(createAssessorDtoSchema))
  createAssessorDto: CreateAssessorDto,
): Promise<LlmResponse> {
  // Input is guaranteed to be valid
}
```

**Benefits**:

- Input transformation and validation
- Consistent error handling
- Reusable across different endpoints
- Type safety guarantees

### Observer Pattern

**Implementation**: Logging System (`nestjs-pino`)

The Observer pattern is used for logging where multiple components can emit log events.

```typescript
// Logger acts as observable subject
export class AssessorService {
  private readonly logger = new Logger(AssessorService.name);

  async createAssessment(dto: CreateAssessorDto): Promise<LlmResponse> {
    this.logger.log('Creating assessment'); // Emit log event
    // ... business logic
    this.logger.debug('Assessment completed'); // Emit log event
  }
}

// Pino logger acts as observer, handling all log events
// Configuration in app.module.ts centralises log handling
```

**Benefits**:

- Decoupled logging from business logic
- Centralised log configuration
- Multiple log destinations support
- Consistent log formatting

### Chain of Responsibility Pattern

**Implementation**: Exception Handling (`src/common/http-exception.filter.ts`)

The Chain of Responsibility pattern handles different types of exceptions through a processing chain.

```typescript
@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // Chain of exception handling
    if (exception instanceof HttpException) {
      this.handleHttpException(exception, host);
    } else if (exception instanceof ZodError) {
      this.handleZodError(exception, host);
    } else {
      this.handleGenericError(exception, host);
    }
  }

  private handleHttpException(
    exception: HttpException,
    host: ArgumentsHost,
  ): void {
    // Specific handling for HTTP exceptions
  }

  private handleZodError(exception: ZodError, host: ArgumentsHost): void {
    // Specific handling for validation errors
  }

  private handleGenericError(exception: unknown, host: ArgumentsHost): void {
    // Generic error handling
  }
}
```

**Benefits**:

- Organised error handling logic
- Easy to add new error types
- Consistent error response format
- Separation of concerns for different error types

### Command Pattern

**Implementation**: Assessment Creation Workflow

The Command pattern encapsulates the assessment request as an object, allowing for parameterisation and queueing.

```typescript
// Command interface (implicitly defined by DTO)
interface CreateAssessorDto {
  taskType: TaskType;
  reference: string;
  template: string;
  studentResponse: string;
}

// Command handler
export class AssessorService {
  async createAssessment(command: CreateAssessorDto): Promise<LlmResponse> {
    // Execute the command
    const prompt = await this.promptFactory.create(command);
    const message = await prompt.buildMessage();
    return this.llmService.send(message);
  }
}

// Invoker
export class AssessorController {
  async create(createAssessorDto: CreateAssessorDto): Promise<LlmResponse> {
    return this.assessorService.createAssessment(createAssessorDto);
  }
}
```

**Benefits**:

- Decouples request from execution
- Parameterises objects with different requests
- Enables request logging and auditing
- Supports undo operations (if needed)

## NestJS-Specific Patterns

### Module Pattern

**Implementation**: Feature-based module organization

```typescript
// Feature modules encapsulate related functionality
@Module({
  imports: [ConfigModule, LlmModule, PromptModule], // Dependencies
  controllers: [AssessorController], // HTTP layer
  providers: [AssessorService], // Business logic
  exports: [AssessorService], // Public API
})
export class AssessorModule {}
```

**Benefits**:

- Logical grouping of related functionality
- Clear dependency management
- Modular application architecture
- Easy testing and maintenance

### Interceptor Pattern

**Implementation**: Logging Interceptor

```typescript
// Global logging interceptor
app.useGlobalInterceptors(new LoggerErrorInterceptor());

// Intercepts all requests/responses for logging
export class LoggerErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Pre-processing
    return next
      .handle()
      .pipe(tap(/* success logging */), catchError(/* error logging */));
  }
}
```

**Benefits**:

- Cross-cutting concern handling
- Request/response transformation
- Global application of logging logic
- Non-intrusive monitoring

## Pattern Interactions

### Factory + Strategy + Template Method

The prompt system combines multiple patterns:

```typescript
// Factory creates strategies
const prompt = await promptFactory.create(dto); // Factory

// Strategy defines interface
class Prompt {
  /* Template Method */
} // Template Method
class TextPrompt extends Prompt {} // Concrete Strategy
class ImagePrompt extends Prompt {} // Concrete Strategy

// Template method with strategy-specific steps
prompt.buildMessage(); // Template Method execution
```

### Guard + Strategy + Provider

Authentication system pattern interaction:

```typescript
// Provider pattern injection
@Controller()
@UseGuards(ApiKeyGuard) // Guard Pattern
export class AssessorController {
  constructor(
    private readonly configService: ConfigService, // Provider Pattern
  ) {}
}

// Guard uses Strategy
export class ApiKeyGuard extends AuthGuard('bearer') {
  // Uses ApiKeyStrategy (Strategy Pattern)
}
```

## Benefits Summary

| Pattern                 | Primary Benefit               | Use Case                     |
| ----------------------- | ----------------------------- | ---------------------------- |
| Factory                 | Object creation flexibility   | Prompt type selection        |
| Strategy                | Algorithm interchangeability  | LLM provider abstraction     |
| Template Method         | Code reuse with customization | Prompt building process      |
| Guard                   | Request interception          | Authentication/authorization |
| Pipe                    | Data transformation           | Input validation             |
| Provider                | Dependency management         | Service injection            |
| Observer                | Event notification            | Logging system               |
| Chain of Responsibility | Error handling                | Exception processing         |
| Command                 | Request encapsulation         | Assessment workflow          |

## Testing Implications

These patterns facilitate testing by:

- **Dependency Injection**: Easy mock injection for unit tests
- **Strategy Pattern**: Test different LLM providers independently
- **Factory Pattern**: Test prompt creation logic in isolation
- **Guard Pattern**: Test authentication separately from business logic
- **Pipe Pattern**: Test validation logic independently

---

_For architectural context, see [Architecture Overview](overview.md) and [Module Responsibilities](modules.md)._
