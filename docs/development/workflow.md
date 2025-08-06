# Development Workflow

This document outlines the local development practices and procedures for the AssessmentBot-Backend project.

## Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js 22** (as specified in package.json engines)
- **npm** (comes with Node.js)
- **Git** for version control
- **Docker** (optional, for containerised development)
- **VS Code** (recommended, with dev container support)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/h-arnold/AssessmentBot-Backend.git
cd AssessmentBot-Backend
npm install
```

### 2. Environment Configuration

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables in `.env`:

   ```bash
   # Required for LLM functionality
   GEMINI_API_KEY=your_actual_gemini_api_key

   # Development settings
   NODE_ENV=development
   PORT=3000
   LOG_LEVEL=debug

   # Authentication (generate secure API keys)
   API_KEYS=your_dev_key_1,your_dev_key_2
   ```

3. For testing, also copy the test environment:
   ```bash
   cp .test.env.example .test.env
   # Add your GEMINI_API_KEY to .test.env as well
   ```

### 3. Verify Setup

```bash
# Install dependencies and prepare git hooks
npm install

# Verify the application builds
npm run build

# Run tests to ensure everything works
npm test

# Run linting checks
npm run lint
```

## Development Server

### Starting the Development Server

```bash
# Start with hot reload (recommended for development)
npm run start:dev

# Alternative: Start in debug mode
npm run start:debug
```

The development server will:

- Start on port 3000 (configurable via PORT env var)
- Watch for file changes and automatically restart
- Use `pino-pretty` for readable console logging
- Enable debug-level logging by default

### Accessing the Application

- **API Base URL**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/status`
- **Swagger Documentation**: Available via NestJS Swagger (if enabled)

## Development Workflow

### Feature Development Process

1. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Changes**
   - Follow the modular NestJS architecture
   - Write tests alongside your code (TDD approach)
   - Ensure British English compliance
   - Adhere to the coding standards

3. **Test Your Changes**

   ```bash
   # Run unit tests
   npm test

   # Run E2E tests
   npm run test:e2e

   # Run with coverage
   npm run test:cov
   ```

4. **Lint and Format**

   ```bash
   # Fix linting issues
   npm run lint:fix

   # Format code
   npm run format

   # Check British English compliance
   npm run lint:british
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: implement new feature"
   git push origin feature/your-feature-name
   ```

### Pre-commit Hooks

The project uses Husky to run quality checks before commits:

- **ESLint**: Automatically fixes linting issues
- **Prettier**: Formats code according to project standards
- **British English Check**: Ensures proper spelling conventions
- **Type Checking**: Validates TypeScript types

## Common Development Tasks

### Adding New Endpoints

1. **Create or modify a controller**:

   ```typescript
   @Controller('your-resource')
   export class YourController {
     @Post()
     async create(@Body() dto: CreateYourDto): Promise<YourResponse> {
       // Implementation
     }
   }
   ```

2. **Create DTOs with Zod validation**:

   ```typescript
   export const CreateYourDtoSchema = z.object({
     name: z.string().min(1),
     // ... other fields
   });

   export type CreateYourDto = z.infer<typeof CreateYourDtoSchema>;
   ```

3. **Add tests**:
   ```typescript
   describe('YourController', () => {
     it('should create resource', async () => {
       // Test implementation
     });
   });
   ```

### Creating New Modules

Use the NestJS CLI for consistency:

```bash
# Generate a new module
npx nest generate module your-module

# Generate a controller
npx nest generate controller your-module

# Generate a service
npx nest generate service your-module
```

### Writing Tests

- **Unit Tests**: Co-locate with source files (`.spec.ts`)
- **Integration Tests**: Test module interactions
- **E2E Tests**: Place in `test/` directory (`.e2e-spec.ts`)

Test structure example:

```typescript
describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Environment-specific Development

#### Dev Container (Recommended)

If using VS Code with Docker:

1. Open the project in VS Code
2. When prompted, choose "Reopen in Container"
3. The dev container will automatically:
   - Install dependencies
   - Build the project
   - Set up the development environment

#### Local Development

For local development without containers:

- Ensure Node.js 22 is installed
- Use the provided VS Code tasks for common operations
- Install recommended VS Code extensions for optimal DX

## Hot Reload and Live Development

The development server (`npm run start:dev`) provides:

- **Automatic Restart**: Watches TypeScript files for changes
- **Incremental Compilation**: Fast rebuilds on save
- **Preserved State**: Maintains environment and configuration
- **Detailed Logging**: Debug-level logs for development

### Debugging During Development

- Use `npm run start:debug` for debug mode
- Set breakpoints in VS Code
- Inspect variables and step through code
- Monitor logs for application flow

## Project Structure Conventions

When adding new features, follow these conventions:

```
src/
├── common/           # Shared utilities, pipes, guards
├── config/           # Configuration management
├── [feature]/        # Feature modules (e.g., auth, llm)
│   ├── *.module.ts   # Module definition
│   ├── *.service.ts  # Business logic
│   ├── *.controller.ts # HTTP handlers
│   ├── *.spec.ts     # Unit tests
│   └── dto/          # Data transfer objects
└── v1/               # API version namespace
```

## Quality Assurance

All code must pass:

- **TypeScript compilation** (`npm run build`)
- **Unit tests** (`npm test`)
- **E2E tests** (`npm run test:e2e`)
- **Linting** (`npm run lint`)
- **British English compliance** (`npm run lint:british`)

The CI pipeline enforces these standards on all pull requests.
