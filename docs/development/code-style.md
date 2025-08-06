# Code Style Guide

This document outlines the coding standards and conventions for the AssessmentBot-Backend project.

## Language and Spelling Standards

### British English Requirement

**All code, comments, documentation, and commit messages must use British English spellings.**

```typescript
// ✅ Correct (British English)
export class UserAuthorisationService {
  private readonly colour: string = 'blue';

  /**
   * Initialises the user authorisation system.
   * @param centre The centre point for calculations
   */
  initialise(centre: Point): void {
    // Implementation
  }
}

// ❌ Incorrect (American English)
export class UserAuthorizationService {
  private readonly color: string = 'blue';

  /**
   * Initializes the user authorization system.
   * @param center The center point for calculations
   */
  initialize(center: Point): void {
    // Implementation
  }
}
```

#### Enforcement

British English compliance is enforced automatically:

```bash
# Manual check
npm run lint:british

# Automatic check (runs on commit)
git commit -m "feat: your changes"
```

Common British vs American spellings:

- `authorise` / `authorize`
- `colour` / `color`
- `centre` / `center`
- `defence` / `defense`
- `organise` / `organize`
- `realise` / `realize`
- `analyse` / `analyze`

## TypeScript Standards

### Type Safety

**All code must be strictly typed with explicit return types.**

```typescript
// ✅ Correct - Explicit return type
async function processData(input: string): Promise<ProcessedData> {
  return await this.dataService.process(input);
}

// ❌ Incorrect - Missing return type
async function processData(input: string) {
  return await this.dataService.process(input);
}
```

### No `any` Types

```typescript
// ✅ Correct - Proper typing
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

function handleResponse<T>(response: ApiResponse<T>): T {
  return response.data;
}

// ❌ Incorrect - Using any
function handleResponse(response: any): any {
  return response.data;
}
```

### Interface and Type Definitions

```typescript
// ✅ Correct - Clear interface definition
interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
  readonly roles: ReadonlyArray<UserRole>;
}

// ✅ Correct - Type alias for unions
type UserRole = 'admin' | 'user' | 'moderator';

// ✅ Correct - Generic constraints
interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
}
```

## Code Organisation

### Module Structure

Follow NestJS modular architecture patterns:

```typescript
// ✅ Correct module structure
@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService], // Only export what other modules need
})
export class UserModule {}
```

### File Naming Conventions

```
src/
├── user/
│   ├── user.controller.ts      # HTTP endpoints
│   ├── user.service.ts         # Business logic
│   ├── user.module.ts          # Module definition
│   ├── user.controller.spec.ts # Controller tests
│   ├── user.service.spec.ts    # Service tests
│   └── dto/
│       ├── create-user.dto.ts  # Input DTOs
│       └── user-response.dto.ts # Output DTOs
```

### Import Organisation

ESLint enforces import ordering:

```typescript
// 1. Node.js built-in modules
import { readFile } from 'fs/promises';

// 2. External dependencies
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

// 3. Internal modules (absolute paths)
import { ConfigService } from 'src/config/config.service';
import { UserEntity } from 'src/user/entities/user.entity';

// 4. Relative imports
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
```

## NestJS Conventions

### Dependency Injection

```typescript
// ✅ Correct - Constructor injection
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}
}
```

### Controller Design

```typescript
// ✅ Correct - RESTful controller
@Controller('v1/users')
@UseGuards(AuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return await this.userService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @UsePipes(new ZodValidationPipe(CreateUserDtoSchema))
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return await this.userService.create(createUserDto);
  }
}
```

### Service Implementation

```typescript
// ✅ Correct - Service with proper error handling
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<UserResponseDto> {
    this.logger.debug(`Finding user with ID: ${id}`);

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToResponseDto(user);
  }

  private mapToResponseDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
```

## Data Validation

### Zod Schema Definition

**All input validation must use Zod schemas.**

```typescript
// ✅ Correct - Comprehensive Zod schema
export const CreateUserDtoSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),

  email: z.string().email('Invalid email format').min(1, 'Email is required'),

  age: z
    .number()
    .int('Age must be an integer')
    .min(18, 'Must be at least 18 years old')
    .max(120, 'Age must be realistic'),

  roles: z
    .array(z.enum(['admin', 'user', 'moderator']))
    .min(1, 'At least one role is required'),
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;
```

### Custom Validation Pipes

```typescript
// ✅ Correct - Reusable validation pipe
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown, metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
```

## Error Handling

### Exception Handling

```typescript
// ✅ Correct - Specific exceptions with context
if (!user) {
  throw new NotFoundException({
    message: 'User not found',
    code: 'USER_NOT_FOUND',
    userId: id,
  });
}

if (user.isDeleted) {
  throw new ConflictException({
    message: 'Cannot modify deleted user',
    code: 'USER_DELETED',
    userId: id,
  });
}
```

### Logging Errors

```typescript
// ✅ Correct - Structured error logging
try {
  await this.riskyOperation();
} catch (error) {
  this.logger.error('Risk operation failed', {
    error: error.message,
    stack: error.stack,
    userId: userId,
    operation: 'riskyOperation',
  });
  throw new InternalServerErrorException('Operation failed');
}
```

## Testing Standards

### Unit Test Structure

```typescript
// ✅ Correct - Comprehensive unit test
describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'test-id';
      const mockUser = { id: userId, name: 'Test User' };
      repository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: userId,
          name: 'Test User',
        }),
      );
      expect(repository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 'non-existent-id';
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
```

### E2E Test Standards

```typescript
// ✅ Correct - E2E test with proper setup
describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create user successfully', () => {
      return request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', 'Bearer valid-api-key')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          age: 25,
          roles: ['user'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test User');
        });
    });
  });
});
```

## Documentation Standards

### JSDoc Comments

````typescript
/**
 * Processes user authentication and returns JWT token.
 *
 * @param credentials - User login credentials
 * @param credentials.email - User's email address
 * @param credentials.password - User's password
 * @returns Promise resolving to authentication result with JWT token
 *
 * @throws {UnauthorizedException} When credentials are invalid
 * @throws {TooManyRequestsException} When rate limit is exceeded
 *
 * @example
 * ```typescript
 * const result = await authService.authenticate({
 *   email: 'user@example.com',
 *   password: 'secretPassword'
 * });
 * console.log(result.accessToken);
 * ```
 */
async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
  // Implementation
}
````

### API Documentation

```typescript
// ✅ Correct - Comprehensive Swagger documentation
@ApiOperation({
  summary: 'Create new user account',
  description: 'Creates a new user account with the provided information. Requires admin privileges.',
})
@ApiResponse({
  status: 201,
  description: 'User successfully created',
  type: UserResponseDto,
})
@ApiResponse({
  status: 400,
  description: 'Invalid input data',
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      errors: { type: 'array', items: { type: 'object' } },
    },
  },
})
@ApiResponse({ status: 401, description: 'Unauthorised access' })
@ApiResponse({ status: 403, description: 'Insufficient permissions' })
@Post()
async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
  return await this.userService.create(createUserDto);
}
```

## Code Formatting

### ESLint Configuration

The project uses comprehensive ESLint rules:

```javascript
// Key rules enforced:
{
  '@typescript-eslint/explicit-function-return-type': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  'import/order': 'error', // Enforces import organisation
  'security/detect-eval-with-expression': 'error',
  'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
}
```

### Prettier Configuration

```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

### Line Length and Formatting

- **Maximum line length**: 100 characters (Prettier default)
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Trailing commas**: Always include trailing commas

## Security Standards

### Input Sanitisation

```typescript
// ✅ Correct - Validate and sanitise all inputs
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1024 * 1024 }), // 1MB
        new FileTypeValidator({ fileType: /^image\/(png|jpeg)$/ }),
      ],
    }),
  )
  file: Express.Multer.File,
): Promise<UploadResponseDto> {
  return await this.fileService.processUpload(file);
}
```

### Sensitive Data Handling

```typescript
// ✅ Correct - Never log sensitive information
this.logger.debug('User authentication attempt', {
  email: user.email,
  // ❌ Never log: password, API keys, tokens
});

// ✅ Correct - Redact sensitive data in logs
this.logger.debug('API request', {
  endpoint: req.url,
  method: req.method,
  userAgent: req.headers['user-agent'],
  // API key automatically redacted by LogRedactor
});
```

## Performance Considerations

### Async/Await Best Practices

```typescript
// ✅ Correct - Parallel execution when possible
async function fetchUserData(userId: string): Promise<UserData> {
  const [user, preferences, permissions] = await Promise.all([
    this.userRepository.findById(userId),
    this.preferencesService.getForUser(userId),
    this.permissionsService.getForUser(userId),
  ]);

  return { user, preferences, permissions };
}

// ❌ Incorrect - Sequential execution (slower)
async function fetchUserData(userId: string): Promise<UserData> {
  const user = await this.userRepository.findById(userId);
  const preferences = await this.preferencesService.getForUser(userId);
  const permissions = await this.permissionsService.getForUser(userId);

  return { user, preferences, permissions };
}
```

## Enforcement

All style guidelines are automatically enforced through:

1. **Pre-commit hooks** (Husky + lint-staged)
2. **CI/CD pipeline** checks
3. **ESLint and Prettier** integration
4. **TypeScript compiler** strict mode
5. **British English checker** script

To check compliance manually:

```bash
# Run all checks
npm run lint
npm run lint:british
npm run format
npm test
npm run build
```
